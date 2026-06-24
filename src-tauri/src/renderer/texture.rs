use bytemuck::cast_slice;
use half::f16;

/// GPU texture holding the currently uploaded renderer image.
pub(super) struct ImageTexture {
    current_texture: wgpu::Texture,
    current_view: wgpu::TextureView,
    width: u32,
    height: u32,
}

impl ImageTexture {
    /// Creates a placeholder image texture so display resources can bind immediately.
    pub(super) fn new(device: &wgpu::Device, queue: &wgpu::Queue) -> Self {
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
    pub(super) fn update(
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

    /// Returns the texture view used by presentation shaders.
    pub(super) fn view(&self) -> &wgpu::TextureView {
        &self.current_view
    }

    /// Returns the current image texture width.
    pub(super) fn width(&self) -> u32 {
        self.width
    }

    /// Returns the current image texture height.
    pub(super) fn height(&self) -> u32 {
        self.height
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
/// Currently this lives in the texture upload boundary so the renderer owns the
/// GPU storage format decision. If this conversion becomes a bottleneck, we can
/// move it closer to texel packing or make it part of a dedicated staging path.
fn convert_texels_to_f16(texels: &[f32]) -> Vec<f16> {
    texels.iter().map(|value| f16::from_f32(*value)).collect()
}
