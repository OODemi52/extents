use anyhow::{anyhow, Result};
use rawler::imgop::xyz::Illuminant;
use rawler::rawimage::RawPhotometricInterpretation;
use rawler::{RawImage, RawImageData};

use crate::core::image::orientation::Orientation;
use crate::core::image::ImageDimensions;

/// CPU-side RAW sensor payload intended for GPU RAW development upload.
///
/// This is intentionally narrow. The first GPU RAW development target is a
/// one-plane, 2x2 RGB CFA image. Other RAW layouts should be added explicitly
/// instead of being forced through this shape.
#[derive(Debug, Clone)]
pub struct RawSource {
    samples: RawSamples,
    dimensions: ImageDimensions,
    bits_per_sample: u32,
    cfa: RawCfaPattern,
    black_levels: RawLevels,
    white_levels: RawLevels,
    active_area: Option<RawRect>,
    crop_area: Option<RawRect>,
    black_areas: Vec<RawRect>,
    white_balance_coefficients: [f32; 4],
    color_matrix_anchors: Vec<RawColorMatrixAnchor>,
    orientation: Option<Orientation>,
    camera_make: String,
    camera_model: String,
}

impl RawSource {
    /// Builds a GPU-oriented RAW sensor source from rawler's decoded RAW image.
    pub fn from_raw_image(raw_image: &RawImage, orientation: Option<Orientation>) -> Result<Self> {
        if raw_image.cpp != 1 {
            return Err(anyhow!(
                "GPU RAW source currently supports one sample per photosite, got cpp={}",
                raw_image.cpp
            ));
        }

        let cfa = match &raw_image.photometric {
            RawPhotometricInterpretation::Cfa(config)
                if config.cfa.is_rgb() && config.cfa.width == 2 && config.cfa.height == 2 =>
            {
                match RawCfaPattern::from_rawler_config(config) {
                    Ok(cfa) => cfa,
                    Err(error) => return Err(error),
                }
            }
            RawPhotometricInterpretation::Cfa(config) => {
                return Err(anyhow!(
                    "GPU RAW source currently supports 2x2 RGB CFA patterns, got {} ({}x{})",
                    config.cfa,
                    config.cfa.width,
                    config.cfa.height
                ));
            }
            photometric => {
                return Err(anyhow!(
                    "GPU RAW source currently requires CFA RAW data, got {photometric:?}"
                ));
            }
        };

        let width = match u32::try_from(raw_image.width) {
            Ok(width) => width,
            Err(_) => return Err(anyhow!("RAW sensor width exceeds u32")),
        };
        let height = match u32::try_from(raw_image.height) {
            Ok(height) => height,
            Err(_) => return Err(anyhow!("RAW sensor height exceeds u32")),
        };
        let dimensions = match ImageDimensions::new(width, height) {
            Ok(dimensions) => dimensions,
            Err(error) => return Err(error),
        };

        let samples = RawSamples::from_raw_image_data(&raw_image.data);
        let expected_sample_count = match dimensions.pixel_count() {
            Ok(expected_sample_count) => expected_sample_count,
            Err(error) => return Err(error),
        };

        if samples.len() != expected_sample_count {
            return Err(anyhow!(
                "RAW sensor sample count {} does not match dimensions {}x{}",
                samples.len(),
                dimensions.width(),
                dimensions.height()
            ));
        }

        let bits_per_sample = match u32::try_from(raw_image.bps) {
            Ok(bits_per_sample) => bits_per_sample,
            Err(_) => return Err(anyhow!("RAW bits-per-sample exceeds u32")),
        };

        let active_area = match raw_image.active_area {
            Some(rect) => match RawRect::from_rawler_rect(rect) {
                Ok(rect) => Some(rect),
                Err(error) => return Err(error),
            },
            None => None,
        };

        let crop_area = match raw_image.crop_area {
            Some(rect) => match RawRect::from_rawler_rect(rect) {
                Ok(rect) => Some(rect),
                Err(error) => return Err(error),
            },
            None => None,
        };

        let black_areas = match raw_image
            .blackareas
            .iter()
            .copied()
            .map(RawRect::from_rawler_rect)
            .collect::<Result<Vec<_>>>()
        {
            Ok(black_areas) => black_areas,
            Err(error) => return Err(error),
        };

        let color_matrix_anchors = match extract_camera_color_matrix_anchors(raw_image) {
            Ok(color_matrix_anchors) => color_matrix_anchors,
            Err(error) => return Err(error),
        };

        Ok(Self {
            samples,
            dimensions,
            bits_per_sample,
            cfa,
            black_levels: RawLevels::from_rawler_black_level(&raw_image.blacklevel),
            white_levels: RawLevels::from_rawler_white_level(&raw_image.whitelevel),
            active_area,
            crop_area,
            black_areas,
            white_balance_coefficients: raw_image.wb_coeffs,
            color_matrix_anchors,
            orientation,
            camera_make: raw_image.clean_make.clone(),
            camera_model: raw_image.clean_model.clone(),
        })
    }

    /// Returns the decoded RAW sensor samples.
    pub fn samples(&self) -> &RawSamples {
        &self.samples
    }

    /// Returns the full decoded RAW sensor dimensions.
    pub fn dimensions(&self) -> ImageDimensions {
        self.dimensions
    }

    /// Returns the source bits per sample reported by the decoder.
    pub fn bits_per_sample(&self) -> u32 {
        self.bits_per_sample
    }

    /// Returns the repeating CFA pattern.
    pub fn cfa(&self) -> &RawCfaPattern {
        &self.cfa
    }

    /// Returns black levels aligned to the 2x2 CFA positions.
    pub fn black_levels(&self) -> RawLevels {
        self.black_levels
    }

    /// Returns white levels aligned to the 2x2 CFA positions.
    pub fn white_levels(&self) -> RawLevels {
        self.white_levels
    }

    /// Returns the active sensor area, if the RAW metadata provides one.
    pub fn active_area(&self) -> Option<RawRect> {
        self.active_area
    }

    /// Returns the recommended crop area, if the RAW metadata provides one.
    pub fn crop_area(&self) -> Option<RawRect> {
        self.crop_area
    }

    /// Returns masked black-reference areas, if the RAW metadata provides them.
    pub fn black_areas(&self) -> &[RawRect] {
        &self.black_areas
    }

    /// Returns the as-shot white-balance coefficients in rawler's RGBE order.
    pub fn white_balance_coefficients(&self) -> [f32; 4] {
        self.white_balance_coefficients
    }

    /// Returns supported camera color matrix anchors.
    pub fn color_matrix_anchors(&self) -> &[RawColorMatrixAnchor] {
        &self.color_matrix_anchors
    }

    /// Returns the orientation transform that still needs to be applied.
    pub fn orientation(&self) -> Option<Orientation> {
        self.orientation
    }

    /// Returns the cleaned camera make reported by rawler.
    pub fn camera_make(&self) -> &str {
        &self.camera_make
    }

    /// Returns the cleaned camera model reported by rawler.
    pub fn camera_model(&self) -> &str {
        &self.camera_model
    }
}

/// RAW sensor sample storage before GPU upload.
#[derive(Debug, Clone)]
pub enum RawSamples {
    IntegerU16(Vec<u16>),
    Float32(Vec<f32>),
}

impl RawSamples {
    /// Returns the number of scalar sensor samples.
    pub fn len(&self) -> usize {
        match self {
            Self::IntegerU16(samples) => samples.len(),
            Self::Float32(samples) => samples.len(),
        }
    }

    /// Returns true when the sample payload is empty.
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    fn from_raw_image_data(data: &RawImageData) -> Self {
        match data {
            RawImageData::Integer(samples) => Self::IntegerU16(samples.clone()),
            RawImageData::Float(samples) => Self::Float32(samples.clone()),
        }
    }
}

/// A 2x2 RGB color filter array pattern.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RawCfaPattern {
    pattern: [u32; 4],
    plane_colors: [u32; 3],
}

impl RawCfaPattern {
    /// Returns the 2x2 CFA pattern in row-major order.
    pub fn pattern(&self) -> [u32; 4] {
        self.pattern
    }

    /// Returns the source plane colors in rawler's CFA color codes.
    pub fn plane_colors(&self) -> [u32; 3] {
        self.plane_colors
    }

    fn from_rawler_config(config: &rawler::rawimage::CFAConfig) -> Result<Self> {
        if config.colors.plane_count() != 3 {
            return Err(anyhow!(
                "GPU RAW source currently supports three RGB planes, got {} planes",
                config.colors.plane_count()
            ));
        }

        let pattern_values = config.cfa.flat_pattern();
        if pattern_values.len() != 4 {
            return Err(anyhow!(
                "GPU RAW source expected four CFA pattern samples, got {}",
                pattern_values.len()
            ));
        }

        let plane_colors = config.colors.plane_colors::<3>().map(|color| color as u32);

        Ok(Self {
            pattern: [
                u32::from(pattern_values[0]),
                u32::from(pattern_values[1]),
                u32::from(pattern_values[2]),
                u32::from(pattern_values[3]),
            ],
            plane_colors,
        })
    }
}

/// Four sensor levels aligned to the 2x2 CFA positions.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RawLevels {
    values: [f32; 4],
}

impl RawLevels {
    /// Returns the levels in 2x2 CFA row-major order.
    pub fn values(self) -> [f32; 4] {
        self.values
    }

    fn from_rawler_black_level(black_level: &rawler::rawimage::BlackLevel) -> Self {
        Self {
            values: black_level.as_bayer_array(),
        }
    }

    fn from_rawler_white_level(white_level: &rawler::rawimage::WhiteLevel) -> Self {
        Self {
            values: white_level.as_bayer_array(),
        }
    }
}

/// A sensor-space rectangle.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RawRect {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}

impl RawRect {
    /// Returns the left coordinate.
    pub fn x(self) -> u32 {
        self.x
    }

    /// Returns the top coordinate.
    pub fn y(self) -> u32 {
        self.y
    }

    /// Returns the rectangle width.
    pub fn width(self) -> u32 {
        self.width
    }

    /// Returns the rectangle height.
    pub fn height(self) -> u32 {
        self.height
    }

    fn from_rawler_rect(rect: rawler::imgop::Rect) -> Result<Self> {
        let x = match u32::try_from(rect.p.x) {
            Ok(x) => x,
            Err(_) => return Err(anyhow!("RAW rectangle x coordinate exceeds u32")),
        };
        let y = match u32::try_from(rect.p.y) {
            Ok(y) => y,
            Err(_) => return Err(anyhow!("RAW rectangle y coordinate exceeds u32")),
        };
        let width = match u32::try_from(rect.d.w) {
            Ok(width) => width,
            Err(_) => return Err(anyhow!("RAW rectangle width exceeds u32")),
        };
        let height = match u32::try_from(rect.d.h) {
            Ok(height) => height,
            Err(_) => return Err(anyhow!("RAW rectangle height exceeds u32")),
        };

        Ok(Self {
            x,
            y,
            width,
            height,
        })
    }
}

/// A supported camera color matrix tied to one calibration illuminant.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RawColorMatrixAnchor {
    illuminant: u16,
    xyz_to_camera: [f32; 9],
}

impl RawColorMatrixAnchor {
    /// Returns the DNG/EXIF illuminant code associated with this matrix.
    pub fn illuminant(self) -> u16 {
        self.illuminant
    }

    /// Returns the flat 3x3 XYZ-to-camera matrix in row-major order.
    pub fn xyz_to_camera(self) -> [f32; 9] {
        self.xyz_to_camera
    }
}

fn extract_camera_color_matrix_anchors(raw_image: &RawImage) -> Result<Vec<RawColorMatrixAnchor>> {
    let mut anchors = Vec::with_capacity(raw_image.color_matrix.len());

    for (illuminant, matrix) in &raw_image.color_matrix {
        if matrix.len() == 9 {
            anchors.push(RawColorMatrixAnchor {
                illuminant: illuminant_code(*illuminant),
                xyz_to_camera: [
                    matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5], matrix[6],
                    matrix[7], matrix[8],
                ],
            });
        }
    }

    anchors.sort_by_key(|anchor| anchor.illuminant);

    if anchors.is_empty() {
        return Err(anyhow!(
            "GPU RAW source requires at least one 3x3 camera color matrix"
        ));
    }

    Ok(anchors)
}

fn illuminant_code(illuminant: Illuminant) -> u16 {
    illuminant.into()
}
