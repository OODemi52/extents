use std::path::Path;

use anyhow::Result;

use crate::renderer::output::{read_output_image, RenderSettings, RenderSize};

const CHECKPOINT_MAX_LONG_EDGE: u32 = 1600;

/// Writes an Inspector checkpoint using the shared output path and its own size policy.
pub(in crate::renderer) fn capture_output_png(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    texture: &wgpu::Texture,
    width: u32,
    height: u32,
    path: &Path,
) -> Result<(u32, u32)> {
    let settings = RenderSettings {
        size: RenderSize::Fit {
            max_long_edge: CHECKPOINT_MAX_LONG_EDGE,
        },
    };
    let image = read_output_image(device, queue, texture, width, height, &settings)?;
    image.save(path)?;
    Ok(image.dimensions())
}
