use bytemuck::cast_slice;
use half::f16;

/// GPU image texture used by the renderer processing graph.
pub(super) struct ImageTexture {
    current_texture: wgpu::Texture,
    current_view: wgpu::TextureView,
    width: u32,
    height: u32,
    usage: wgpu::TextureUsages,
    label: &'static str,
}

impl ImageTexture {
    /// Creates a placeholder source texture for CPU-uploaded image texels.
    pub(super) fn new_source(device: &wgpu::Device, queue: &wgpu::Queue) -> Self {
        Self::new(
            device,
            queue,
            "Source Image Texture",
            wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
        )
    }

    /// Creates a placeholder output texture for developed working-space image data.
    pub(super) fn new_development_output(device: &wgpu::Device, queue: &wgpu::Queue) -> Self {
        Self::new_stage_output(device, queue, "Development Output Texture")
    }

    /// Creates a placeholder output texture for normalized Bayer RAW samples.
    ///
    /// The red channel stores the normalized sample and the green channel stores
    /// a clipped-photosite mask produced from CFA-specific sensor white levels.
    pub(super) fn new_raw_normalized_bayer_output(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
    ) -> Self {
        Self::new_stage_output(device, queue, "RAW Normalized Bayer Texture")
    }

    /// Creates a placeholder output texture for highlight-reconstructed Bayer RAW samples.
    pub(super) fn new_raw_reconstructed_bayer_output(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
    ) -> Self {
        Self::new_stage_output(device, queue, "RAW Reconstructed Bayer Texture")
    }

    /// Creates a placeholder output texture for demosaiced camera-space RGB.
    ///
    /// The alpha channel stores a clipped-neighborhood mask for guided recovery.
    pub(super) fn new_raw_camera_rgb_output(device: &wgpu::Device, queue: &wgpu::Queue) -> Self {
        Self::new_stage_output(device, queue, "RAW Camera RGB Texture")
    }

    /// Creates a placeholder output texture for highlight-recovered camera-space RGB.
    pub(super) fn new_raw_recovered_camera_rgb_output(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
    ) -> Self {
        Self::new_stage_output(device, queue, "RAW Recovered Camera RGB Texture")
    }

    /// Creates a placeholder output texture for adjusted working-space image data.
    pub(super) fn new_adjustment_output(device: &wgpu::Device, queue: &wgpu::Queue) -> Self {
        Self::new_stage_output(device, queue, "Adjustment Output Texture")
    }

    /// Creates a placeholder output texture for display-ready image data.
    pub(super) fn new_display_output(device: &wgpu::Device, queue: &wgpu::Queue) -> Self {
        Self::new_stage_output(device, queue, "Display Output Texture")
    }

    fn new_stage_output(device: &wgpu::Device, queue: &wgpu::Queue, label: &'static str) -> Self {
        Self::new(
            device,
            queue,
            label,
            wgpu::TextureUsages::TEXTURE_BINDING
                | wgpu::TextureUsages::STORAGE_BINDING
                | wgpu::TextureUsages::COPY_DST,
        )
    }

    /// Replaces the current texture with packed renderer texels.
    pub(super) fn update(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        texels: &[f32],
        width: u32,
        height: u32,
    ) {
        let texture = self.create_texture(device, width, height);
        upload_texels(queue, &texture, texels, width, height);

        self.current_view = texture.create_view(&wgpu::TextureViewDescriptor::default());

        self.current_texture = texture;

        self.width = width;

        self.height = height;
    }

    /// Replaces the current texture with an empty texture of the requested size.
    pub(super) fn resize_empty(&mut self, device: &wgpu::Device, width: u32, height: u32) {
        let texture = self.create_texture(device, width, height);

        self.current_view = texture.create_view(&wgpu::TextureViewDescriptor::default());

        self.current_texture = texture;

        self.width = width;

        self.height = height;
    }

    /// Returns this texture's default view.
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

    fn new(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        label: &'static str,
        usage: wgpu::TextureUsages,
    ) -> Self {
        let width = 1;
        let height = 1;
        let texture = create_texture(device, label, usage, width, height);
        upload_texels(queue, &texture, &[0.0, 0.0, 0.0, 0.0], width, height);

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());

        Self {
            current_texture: texture,
            current_view: view,
            width,
            height,
            usage,
            label,
        }
    }

    fn create_texture(&self, device: &wgpu::Device, width: u32, height: u32) -> wgpu::Texture {
        create_texture(device, self.label, self.usage, width, height)
    }
}

/// Creates a GPU image texture with the provided usage flags.
fn create_texture(
    device: &wgpu::Device,
    label: &'static str,
    usage: wgpu::TextureUsages,
    width: u32,
    height: u32,
) -> wgpu::Texture {
    let size = wgpu::Extent3d {
        width,
        height,
        depth_or_array_layers: 1,
    };

    device.create_texture(&wgpu::TextureDescriptor {
        label: Some(label),
        size,
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format: IMAGE_TEXTURE_FORMAT,
        usage,
        view_formats: &[],
    })
}

/// Uploads packed working-image texels into an RGBA16F GPU texture.
fn upload_texels(
    queue: &wgpu::Queue,
    texture: &wgpu::Texture,
    texels: &[f32],
    width: u32,
    height: u32,
) {
    let texels_f16 = convert_texels_to_f16(texels);

    queue.write_texture(
        wgpu::TexelCopyTextureInfo {
            texture,
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
        wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
    );
}

pub(super) const IMAGE_TEXTURE_FORMAT: wgpu::TextureFormat = wgpu::TextureFormat::Rgba16Float;

/// Converts packed working-image texels from `f32` to `f16` for GPU upload.
///
/// Currently this lives in the texture upload boundary so the renderer owns the
/// GPU storage format decision. If this conversion becomes a bottleneck, we can
/// move it closer to texel packing or make it part of a dedicated staging path.
fn convert_texels_to_f16(texels: &[f32]) -> Vec<f16> {
    texels.iter().map(|value| f16::from_f32(*value)).collect()
}
