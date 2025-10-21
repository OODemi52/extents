/// Manages texture loading and GPU texture resources
pub struct TextureManager {
    current_texture: wgpu::Texture,
    current_view: wgpu::TextureView,
    pub width: u32,
    pub height: u32,
}

impl TextureManager {
    /// Create a new texture manager with a default 1x1 blue texture
    pub fn new(device: &wgpu::Device, queue: &wgpu::Queue) -> Self {
        let (texture, width, height) = Self::create_texture(device, queue, &[25, 25, 25, 0], 1, 1);

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());

        Self {
            current_texture: texture,
            current_view: view,
            width,
            height,
        }
    }

    /// Update the texture with new RGBA data
    pub fn update(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        rgba: &[u8],
        width: u32,
        height: u32,
    ) {
        let (texture, _, _) = Self::create_texture(device, queue, rgba, width, height);
        self.current_view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        self.current_texture = texture;
        self.width = width;
        self.height = height;
    }

    /// Get the current texture view for binding
    pub fn view(&self) -> &wgpu::TextureView {
        &self.current_view
    }

    /// Create a GPU texture from RGBA data
    fn create_texture(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        rgba: &[u8],
        width: u32,
        height: u32,
    ) -> (wgpu::Texture, u32, u32) {
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
            format: wgpu::TextureFormat::Rgba8UnormSrgb,
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
            rgba,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(4 * width),
                rows_per_image: Some(height),
            },
            size,
        );

        (texture, width, height)
    }
}
