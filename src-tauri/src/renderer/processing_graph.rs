use super::texture::ImageTexture;

/// GPU-side image processing graph for the active renderer image.
///
/// The graph currently presents the uploaded source image directly. It exists
/// as the ownership boundary where future GPU processing stages can be inserted
/// between source upload and display output.
pub(super) struct ImageProcessingGraph {
    source_texture: ImageTexture,
}

impl ImageProcessingGraph {
    /// Creates an empty processing graph with a placeholder source texture.
    pub(super) fn new(device: &wgpu::Device, queue: &wgpu::Queue) -> Self {
        Self {
            source_texture: ImageTexture::new(device, queue),
        }
    }

    /// Uploads packed renderer texels as the current graph source image.
    pub(super) fn upload_source_image(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        texels: &[f32],
        width: u32,
        height: u32,
    ) {
        self.source_texture
            .update(device, queue, texels, width, height);
    }

    /// Returns the current graph output view used by the display resources.
    pub(super) fn output_view(&self) -> &wgpu::TextureView {
        self.source_texture.view()
    }

    /// Returns the current graph output width.
    pub(super) fn output_width(&self) -> u32 {
        self.source_texture.width()
    }

    /// Returns the current graph output height.
    pub(super) fn output_height(&self) -> u32 {
        self.source_texture.height()
    }
}
