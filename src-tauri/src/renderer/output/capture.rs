use anyhow::{anyhow, Result};
use image::RgbaImage;

use super::downsample::downsample_display_texture;
use super::readback::read_display_texture_as_rgba8;
use super::RenderSettings;

/// Returns sRGB pixels in memory at the requested size, without encoding a file.
pub(in crate::renderer) fn read_output_image(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    texture: &wgpu::Texture,
    width: u32,
    height: u32,
    settings: &RenderSettings,
) -> Result<RgbaImage> {
    let (capture_width, capture_height) = settings.dimensions(width, height)?;
    let downsampled_texture;
    let capture_texture = if capture_width < width || capture_height < height {
        downsampled_texture =
            downsample_display_texture(device, queue, texture, capture_width, capture_height)?;
        &downsampled_texture
    } else {
        texture
    };
    let rgba = read_display_texture_as_rgba8(
        device,
        queue,
        capture_texture,
        capture_width,
        capture_height,
    )?;
    RgbaImage::from_raw(capture_width, capture_height, rgba)
        .ok_or_else(|| anyhow!("failed to build output image"))
}
