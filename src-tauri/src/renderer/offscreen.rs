//! Window-independent rendering using the desktop's source decoder and GPU graph.

use std::path::{Path, PathBuf};
use std::time::{Instant, UNIX_EPOCH};

use anyhow::{ensure, Context, Result};
use image::codecs::png::{CompressionType, FilterType, PngEncoder};
use image::{ExtendedColorType, ImageEncoder, RgbaImage};
use serde::Serialize;

use super::context::GpuContext;
use super::input::build_input_from_path;
use super::inspection::{ImageInspection, PipelineInspection, RawImageInspection};
use super::output::RenderSettings;
use super::processing_graph::ImageProcessingGraph;
use crate::core::editing::EditRecipe;

/// Identifies the file that was actually decoded. This is not a content hash.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceIdentity {
    pub path: PathBuf,
    pub file_size: u64,
    pub modified_unix_ms: Option<u64>,
}

/// Wall-clock measurements including GPU completion, not GPU timestamp queries.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadTimings {
    pub input_build_ms: f64,
    pub gpu_setup_ms: f64,
    pub source_development_ms: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderMetadata {
    pub source: SourceIdentity,
    pub recipe: EditRecipe,
    pub settings: RenderSettings,
    pub image: ImageInspection,
    pub pipeline: PipelineInspection,
    pub width: u32,
    pub height: u32,
    pub color_space: &'static str,
    /// Paid once by `open`, retained here for comparison with iteration costs.
    pub load_timings: LoadTimings,
    pub adjustment_ms: f64,
    /// Includes optional downsampling, GPU completion, transfer and sRGB conversion.
    pub readback_ms: f64,
}

/// Display pixels and the recipe that produced them. File I/O is optional.
pub struct RenderedImage {
    pub pixels: RgbaImage,
    pub metadata: RenderMetadata,
}

impl RenderedImage {
    /// Encodes in memory for a file writer or a future image-input adapter.
    pub fn png_bytes(&self) -> Result<Vec<u8>> {
        let mut bytes = Vec::new();
        PngEncoder::new_with_quality(&mut bytes, CompressionType::Fast, FilterType::Adaptive)
            .write_image(
                self.pixels.as_raw(),
                self.pixels.width(),
                self.pixels.height(),
                ExtendedColorType::Rgba8,
            )?;
        Ok(bytes)
    }
}

/// Owns one developed image. Repeated renders retain its GPU resources.
/// This does not read or write sidecars or participate in desktop selection state.
pub struct OffscreenImage {
    graph: ImageProcessingGraph,
    gpu: GpuContext,
    source: SourceIdentity,
    image: ImageInspection,
    pipeline: PipelineInspection,
    load_timings: LoadTimings,
}

impl OffscreenImage {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let path = path
            .as_ref()
            .canonicalize()
            .context("cannot resolve source image")?;
        let before = std::fs::metadata(&path).context("cannot inspect source image")?;
        ensure!(before.is_file(), "source must be an image file");
        let path_str = path.to_str().context("source path must be valid UTF-8")?;

        let start = Instant::now();
        let input = build_input_from_path(path_str)?;
        let input_build_ms = elapsed_ms(start);
        let after = std::fs::metadata(&path)?;
        ensure!(
            before.len() == after.len() && before.modified().ok() == after.modified().ok(),
            "source changed while it was being decoded; retry the request"
        );

        let dimensions = input.image().dimensions();
        let development = input.development_source();
        let output = input.output_transform();
        let image = ImageInspection {
            source_kind: development.source_kind().to_string(),
            width: dimensions.width(),
            height: dimensions.height(),
            has_transparency: input.image().has_transparency(),
            raw: input
                .source_metadata()
                .raw_metadata()
                .map(RawImageInspection::from_source_metadata),
        };
        let pipeline = PipelineInspection {
            development_source: development.label().to_string(),
            display_intent: output.display_intent().label().to_string(),
            base_exposure_ev: Some(output.base_exposure_ev()),
            user_exposure_ev: 0.0,
        };
        let source = SourceIdentity {
            path,
            file_size: before.len(),
            modified_unix_ms: before
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .and_then(|duration| u64::try_from(duration.as_millis()).ok()),
        };

        let start = Instant::now();
        let gpu = GpuContext::new()?;
        let limit = gpu.device.limits().max_texture_dimension_2d;
        ensure!(
            image.width <= limit && image.height <= limit,
            "source dimensions {}x{} exceed GPU texture limit {}",
            image.width,
            image.height,
            limit
        );
        let mut graph = ImageProcessingGraph::new(&gpu.device, &gpu.queue);
        gpu.device.poll(wgpu::PollType::Wait)?;
        let gpu_setup_ms = elapsed_ms(start);

        let start = Instant::now();
        graph.set_input(&gpu.device, &gpu.queue, &input);
        gpu.device.poll(wgpu::PollType::Wait)?;
        let source_development_ms = elapsed_ms(start);

        Ok(Self {
            graph,
            gpu,
            source,
            image,
            pipeline,
            load_timings: LoadTimings {
                input_build_ms,
                gpu_setup_ms,
                source_development_ms,
            },
        })
    }

    /// Applies an absolute recipe to the retained source, then returns display pixels.
    pub fn render(
        &mut self,
        recipe: &EditRecipe,
        settings: &RenderSettings,
    ) -> Result<RenderedImage> {
        settings.validate()?;
        recipe.validate()?;

        let start = Instant::now();
        self.graph
            .update_adjustments(&self.gpu.device, &self.gpu.queue, recipe.exposure_ev);
        self.gpu.device.poll(wgpu::PollType::Wait)?;
        let adjustment_ms = elapsed_ms(start);

        let start = Instant::now();
        let pixels = self
            .graph
            .read_display_output(&self.gpu.device, &self.gpu.queue, settings)?;
        let readback_ms = elapsed_ms(start);
        let mut pipeline = self.pipeline.clone();
        pipeline.user_exposure_ev = recipe.exposure_ev;
        let metadata = RenderMetadata {
            source: self.source.clone(),
            recipe: recipe.clone(),
            settings: *settings,
            image: self.image.clone(),
            pipeline,
            width: pixels.width(),
            height: pixels.height(),
            color_space: "sRGB",
            load_timings: self.load_timings.clone(),
            adjustment_ms,
            readback_ms,
        };
        Ok(RenderedImage { pixels, metadata })
    }
}

fn elapsed_ms(start: Instant) -> f64 {
    start.elapsed().as_secs_f64() * 1000.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::renderer::output::RenderSize;
    use std::time::SystemTime;

    struct Fixture(PathBuf);

    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = std::fs::remove_file(self.0.join("source.png"));
            let _ = std::fs::remove_file(self.0.join("source.exts"));
            let _ = std::fs::remove_file(self.0.join("checkpoint.png"));
            let _ = std::fs::remove_dir(&self.0);
        }
    }

    #[test]
    #[ignore = "requires a working GPU adapter; run with --include-ignored"]
    fn gpu_preview_preserves_source_and_applies_absolute_exposure() -> Result<()> {
        let unique = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos();
        let fixture = Fixture(
            std::env::temp_dir().join(format!("extents-offscreen-{}-{unique}", std::process::id())),
        );
        std::fs::create_dir(&fixture.0)?;
        let path = fixture.0.join("source.png");
        RgbaImage::from_pixel(64, 32, image::Rgba([64, 96, 128, 128])).save(&path)?;
        let source_before = std::fs::read(&path)?;
        let sidecar = fixture.0.join("source.exts");
        std::fs::write(&sidecar, b"existing sidecar must not be read or changed")?;

        let mut image = OffscreenImage::open(&path)?;
        let full = RenderSettings {
            size: RenderSize::Full,
        };
        let neutral = image.render(&EditRecipe::default(), &full)?;
        let bright = image.render(&EditRecipe { exposure_ev: 1.0 }, &full)?;
        let dark = image.render(&EditRecipe { exposure_ev: -1.0 }, &full)?;
        let restored = image.render(&EditRecipe::default(), &full)?;
        for (preview, expected) in [
            (&neutral, [64, 96, 128]),
            (&bright, [90, 133, 176]),
            (&dark, [44, 68, 92]),
        ] {
            let pixel = preview.pixels.get_pixel(32, 16);
            for channel in 0..3 {
                assert!(
                    pixel[channel].abs_diff(expected[channel]) <= 1,
                    "actual {pixel:?}, expected {expected:?}"
                );
            }
            assert_eq!(pixel[3], 128);
        }
        assert_eq!(neutral.pixels, restored.pixels);
        assert_eq!(neutral.pixels.dimensions(), (64, 32));
        assert_eq!(neutral.metadata.settings, full);
        let checkpoint = fixture.0.join("checkpoint.png");
        image
            .graph
            .capture_display_output_png(&image.gpu.device, &image.gpu.queue, &checkpoint)?;
        assert_eq!(image::open(checkpoint)?.into_rgba8(), neutral.pixels);
        assert_eq!(bright.metadata.recipe.exposure_ev, 1.0);
        assert_eq!(bright.metadata.pipeline.user_exposure_ev, 1.0);
        assert_eq!(bright.metadata.image.width, 64);
        assert_eq!(bright.metadata.source.path, path.canonicalize()?);
        let fitted = RenderSettings {
            size: RenderSize::Fit { max_long_edge: 16 },
        };
        let small = image.render(&EditRecipe::default(), &fitted)?;
        assert_eq!(small.pixels.dimensions(), (16, 8));
        assert_eq!((small.metadata.width, small.metadata.height), (16, 8));
        let decoded = image::load_from_memory(&small.png_bytes()?)?.into_rgba8();
        assert_eq!(small.pixels, decoded);
        assert_eq!(small.metadata.settings, fitted);
        let no_upscale = image.render(&EditRecipe::default(), &RenderSettings::default())?;
        assert_eq!(no_upscale.pixels, neutral.pixels);
        assert!(image
            .render(
                &EditRecipe::default(),
                &RenderSettings {
                    size: RenderSize::Fit { max_long_edge: 0 }
                }
            )
            .is_err());
        assert!(image
            .render(
                &EditRecipe {
                    exposure_ev: f32::NAN
                },
                &full
            )
            .is_err());
        assert_eq!(std::fs::read(&path)?, source_before);
        assert_eq!(
            std::fs::read(&sidecar)?,
            b"existing sidecar must not be read or changed"
        );
        eprintln!(
            "load: {:?}; warm adjustment: {:.2} ms; readback: {:.2} ms",
            small.metadata.load_timings, small.metadata.adjustment_ms, small.metadata.readback_ms
        );
        Ok(())
    }
}
