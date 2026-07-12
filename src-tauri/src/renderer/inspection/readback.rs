use std::sync::mpsc;

use anyhow::{anyhow, Result};
use half::f16;

/// Reads an RGBA16F display texture into an 8-bit sRGB RGBA buffer.
pub(in crate::renderer) fn read_display_texture_as_rgba8(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    texture: &wgpu::Texture,
    width: u32,
    height: u32,
) -> Result<Vec<u8>> {
    let source_bytes_per_row = width * 8;
    let padded_bytes_per_row = align_to(source_bytes_per_row, wgpu::COPY_BYTES_PER_ROW_ALIGNMENT);
    let buffer_size = u64::from(padded_bytes_per_row) * u64::from(height);

    let buffer = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Inspection Checkpoint Output Readback Buffer"),
        size: buffer_size,
        usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
        mapped_at_creation: false,
    });

    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("Inspection Checkpoint Output Readback Encoder"),
    });

    encoder.copy_texture_to_buffer(
        wgpu::TexelCopyTextureInfo {
            texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        },
        wgpu::TexelCopyBufferInfo {
            buffer: &buffer,
            layout: wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(padded_bytes_per_row),
                rows_per_image: Some(height),
            },
        },
        wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
    );

    queue.submit(std::iter::once(encoder.finish()));

    let buffer_slice = buffer.slice(..);
    let (sender, receiver) = mpsc::channel();

    buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
        let _ = sender.send(result);
    });

    device.poll(wgpu::PollType::Wait)?;

    match receiver.recv() {
        Ok(Ok(())) => {}
        Ok(Err(error)) => return Err(anyhow!("failed to map renderer output texture: {error}")),
        Err(error) => {
            return Err(anyhow!(
                "failed to receive renderer output readback: {error}"
            ))
        }
    }

    let mapped = buffer_slice.get_mapped_range();
    let mut rgba = Vec::with_capacity((width as usize) * (height as usize) * 4);

    for y in 0..height as usize {
        let row_start = y * padded_bytes_per_row as usize;

        for x in 0..width as usize {
            let pixel_start = row_start + (x * 8);
            let red = read_f16(&mapped, pixel_start);
            let green = read_f16(&mapped, pixel_start + 2);
            let blue = read_f16(&mapped, pixel_start + 4);
            let alpha = read_f16(&mapped, pixel_start + 6);

            rgba.push(linear_srgb_to_u8(red));
            rgba.push(linear_srgb_to_u8(green));
            rgba.push(linear_srgb_to_u8(blue));
            rgba.push(alpha_to_u8(alpha));
        }
    }

    drop(mapped);
    buffer.unmap();

    Ok(rgba)
}

fn align_to(value: u32, alignment: u32) -> u32 {
    value.div_ceil(alignment) * alignment
}

fn read_f16(bytes: &[u8], offset: usize) -> f32 {
    let bits = u16::from_le_bytes([bytes[offset], bytes[offset + 1]]);

    f16::from_bits(bits).to_f32()
}

fn linear_srgb_to_u8(value: f32) -> u8 {
    let value = value.clamp(0.0, 1.0);
    let encoded = if value <= 0.003_130_8 {
        value * 12.92
    } else {
        (1.055 * value.powf(1.0 / 2.4)) - 0.055
    };

    ((encoded.clamp(0.0, 1.0) * 255.0) + 0.5) as u8
}

fn alpha_to_u8(value: f32) -> u8 {
    ((value.clamp(0.0, 1.0) * 255.0) + 0.5) as u8
}
