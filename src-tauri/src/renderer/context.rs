use tauri::WebviewWindow;

pub struct RenderContext<'a> {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub surface: wgpu::Surface<'a>,
    pub config: wgpu::SurfaceConfiguration,
}

impl<'a> RenderContext<'a> {
    pub fn new(window: &'a WebviewWindow) -> Self {
        let size = window.inner_size().unwrap();

        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor::default());

        // Key to note, our surface target is the background of the window
        // Due to this, the app will not work if the main window background
        //  is set to be transparent
        let surface = instance.create_surface(window).unwrap();

        let adapter =
            pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions::default()))
                .unwrap();

        let (device, queue) =
            pollster::block_on(adapter.request_device(&wgpu::DeviceDescriptor::default())).unwrap();

        let surface_capabilities = surface.get_capabilities(&adapter);

        let surface_format = surface_capabilities
            .formats
            .iter()
            .copied()
            .find(|f| f.is_srgb())
            .unwrap_or(surface_capabilities.formats[0]);

        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width: size.width,
            height: size.height,
            present_mode: surface_capabilities.present_modes[0],
            alpha_mode: surface_capabilities.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };

        surface.configure(&device, &config);

        Self {
            device,
            queue,
            surface,
            config,
        }
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            self.config.width = width;

            self.config.height = height;

            self.surface.configure(&self.device, &self.config);
        }
    }
}
