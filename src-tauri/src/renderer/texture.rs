use bytemuck::cast_slice;
use half::f16;

pub struct TextureManager {
    current_texture: wgpu::Texture,
    current_view: wgpu::TextureView,
    pub width: u32,
    pub height: u32,
}

impl TextureManager {
    pub fn new(device: &wgpu::Device, queue: &wgpu::Queue) -> Self {
        let (texture, width, height) =
            Self::create_texture(device, queue, &[0.0, 0.0, 0.0, 0.0], 1, 1);

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());

        Self {
            current_texture: texture,
            current_view: view,
            width,
            height,
        }
    }

    /// Replaces the current live working-image texture with packed renderer texels.
    pub fn update(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        texels: &[f32],
        width: u32,
        height: u32,
    ) {
        let (texture, _, _) = Self::create_texture(device, queue, texels, width, height);

        self.current_view = texture.create_view(&wgpu::TextureViewDescriptor::default());

        self.current_texture = texture;

        self.width = width;

        self.height = height;
    }

    pub fn view(&self) -> &wgpu::TextureView {
        &self.current_view
    }

    /// Creates a GPU texture for packed working-image texels and uploads its contents.
    fn create_texture(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        texels: &[f32],
        width: u32,
        height: u32,
    ) -> (wgpu::Texture, u32, u32) {
        let texels_f16 = convert_texels_to_f16(texels);

        let size = wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        };

        let texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Image Texture"),
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba16Float,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });

        queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            cast_slice(&texels_f16),
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(8 * width),
                rows_per_image: Some(height),
            },
            size,
        );

        (texture, width, height)
    }
}

/// Converts packed working-image texels from `f32` to `f16` for GPU upload.
///
/// Currently we do this here in order to seperate concerns; the render get to
/// decided the data type to convert to, but we need to watch this in case it
/// cause a hit to perf, then we can move this conversion to where we are
/// packing the texels instead
fn convert_texels_to_f16(texels: &[f32]) -> Vec<f16> {
    texels.iter().map(|value| f16::from_f32(*value)).collect()
}
