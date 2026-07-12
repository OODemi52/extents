use std::path::Path;

use anyhow::{anyhow, Result};
use image::RgbaImage;

use super::downsample::downsample_display_texture;
use super::readback::read_display_texture_as_rgba8;

const CHECKPOINT_MAX_LONG_EDGE: u32 = 1600;

/// Writes a display output texture to an 8-bit sRGB PNG checkpoint artifact.
pub(in crate::renderer) fn capture_output_png(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    texture: &wgpu::Texture,
    width: u32,
    height: u32,
    path: &Path,
) -> Result<(u32, u32)> {
    if width == 0 || height == 0 {
        return Err(anyhow!("cannot capture an empty renderer output texture"));
    }

    let capture_size = checkpoint_capture_size(width, height);
    let downsampled_texture;

    let (capture_texture, capture_width, capture_height) =
        if capture_size.width < width || capture_size.height < height {
            downsampled_texture = downsample_display_texture(
                device,
                queue,
                texture,
                capture_size.width,
                capture_size.height,
            )?;

            (
                &downsampled_texture,
                capture_size.width,
                capture_size.height,
            )
        } else {
            (texture, width, height)
        };

    let rgba = read_display_texture_as_rgba8(
        device,
        queue,
        capture_texture,
        capture_width,
        capture_height,
    )?;

    let image = match RgbaImage::from_raw(capture_width, capture_height, rgba) {
        Some(image) => image,
        None => return Err(anyhow!("failed to build checkpoint output image")),
    };

    image.save(path)?;

    Ok((capture_width, capture_height))
}

struct CheckpointCaptureSize {
    width: u32,
    height: u32,
}

fn checkpoint_capture_size(width: u32, height: u32) -> CheckpointCaptureSize {
    let long_edge = width.max(height);

    if long_edge <= CHECKPOINT_MAX_LONG_EDGE {
        return CheckpointCaptureSize { width, height };
    }

    let scale = CHECKPOINT_MAX_LONG_EDGE as f32 / long_edge as f32;

    CheckpointCaptureSize {
        width: ((width as f32 * scale).round() as u32).max(1),
        height: ((height as f32 * scale).round() as u32).max(1),
    }
}
