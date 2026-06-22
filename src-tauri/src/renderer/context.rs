use anyhow::{anyhow, Context, Result};
use tauri::WebviewWindow;

/// Shared GPU objects used by rendering and future image-processing passes.
///
/// This context is independent from any window surface so future
/// compute-based image development can use the same device and queue without
/// depending on presentation state.
pub struct GpuContext {
    pub instance: wgpu::Instance,
    pub adapter: wgpu::Adapter,
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
}

impl GpuContext {
    /// Initializes the shared wgpu instance, adapter, device, and queue.
    pub fn new() -> Result<Self> {
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor::default());

        let adapter = match pollster::block_on(
            instance.request_adapter(&wgpu::RequestAdapterOptions::default()),
        )
        .context("failed to request GPU adapter")
        {
            Ok(adapter) => adapter,
            Err(error) => return Err(error),
        };

        let (device, queue) =
            match pollster::block_on(adapter.request_device(&wgpu::DeviceDescriptor::default()))
                .context("failed to request GPU device")
            {
                Ok(device_and_queue) => device_and_queue,
                Err(error) => return Err(error),
            };

        Ok(Self {
            instance,
            adapter,
            device,
            queue,
        })
    }
}

/// Window-backed presentation state for the renderer surface.
///
/// This context owns only the swapchain-facing surface and its configuration.
/// General GPU work should use `GpuContext` instead.
pub struct SurfaceContext<'a> {
    surface: wgpu::Surface<'a>,
    config: wgpu::SurfaceConfiguration,
}

impl<'a> SurfaceContext<'a> {
    /// Creates and configures the window surface used for presentation.
    pub fn new(window: &'a WebviewWindow, gpu: &GpuContext) -> Result<Self> {
        let size = match window
            .inner_size()
            .context("failed to read renderer window size")
        {
            Ok(size) => size,
            Err(error) => return Err(error),
        };

        // Note: our surface target is the background of the window
        // Due to this, the app will not work if the main window background
        // is set to be transparent
        let surface = match gpu.instance.create_surface(window) {
            Ok(surface) => surface,
            Err(error) => return Err(anyhow!("failed to create renderer surface: {error}")),
        };

        let surface_capabilities = surface.get_capabilities(&gpu.adapter);

        let surface_format = surface_capabilities
            .formats
            .iter()
            .copied()
            .find(|f| f.is_srgb())
            .or_else(|| surface_capabilities.formats.first().copied());
        let surface_format = match surface_format {
            Some(surface_format) => surface_format,
            None => return Err(anyhow!("renderer surface exposes no supported formats")),
        };

        let present_mode = match surface_capabilities.present_modes.first().copied() {
            Some(present_mode) => present_mode,
            None => {
                return Err(anyhow!(
                    "renderer surface exposes no supported present modes"
                ));
            }
        };

        let alpha_mode = match surface_capabilities.alpha_modes.first().copied() {
            Some(alpha_mode) => alpha_mode,
            None => return Err(anyhow!("renderer surface exposes no supported alpha modes")),
        };

        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width: size.width,
            height: size.height,
            present_mode,
            alpha_mode,
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };

        surface.configure(&gpu.device, &config);

        Ok(Self { surface, config })
    }

    /// Returns the texture format used by the window surface.
    pub fn format(&self) -> wgpu::TextureFormat {
        self.config.format
    }

    /// Returns the current configured surface width.
    pub fn width(&self) -> u32 {
        self.config.width
    }

    /// Returns the current configured surface height.
    pub fn height(&self) -> u32 {
        self.config.height
    }

    /// Acquires the next drawable surface texture from the presentation chain.
    pub fn current_texture(&self) -> Result<wgpu::SurfaceTexture, wgpu::SurfaceError> {
        self.surface.get_current_texture()
    }

    /// Reconfigures the presentation surface after a non-zero window resize.
    pub fn resize(&mut self, gpu: &GpuContext, width: u32, height: u32) {
        if width > 0 && height > 0 {
            self.config.width = width;

            self.config.height = height;

            self.surface.configure(&gpu.device, &self.config);
        }
    }
}
