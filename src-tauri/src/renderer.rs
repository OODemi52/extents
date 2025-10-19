use bytemuck::{Pod, Zeroable};
use log::{error, info};
use std::sync::Mutex;
use tauri::WebviewWindow;
use wgpu::util::DeviceExt;

pub struct Viewport {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable)]
pub struct Vertex {
    position: [f32; 3],
    tex_coords: [f32; 2],
}

impl Vertex {
    pub fn desc<'a>() -> wgpu::VertexBufferLayout<'a> {
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Vertex>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 0,
                    format: wgpu::VertexFormat::Float32x3,
                },
                wgpu::VertexAttribute {
                    offset: std::mem::size_of::<[f32; 3]>() as wgpu::BufferAddress,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x2,
                },
            ],
        }
    }
}

#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
struct TransformUniforms {
    scale: [f32; 2],
    offset: [f32; 2],
}

pub struct Renderer<'a> {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub surface: wgpu::Surface<'a>,
    pub config: wgpu::SurfaceConfiguration,
    pub render_pipeline: wgpu::RenderPipeline,
    pub vertex_buffer: wgpu::Buffer,
    pub render_bind_group_layout: wgpu::BindGroupLayout,
    pub render_bind_group: wgpu::BindGroup,
    pub sampler: wgpu::Sampler,
    pub viewport: Mutex<Viewport>,
    pub image_width: u32,
    pub image_height: u32,
    transform_uniforms: TransformUniforms,
    transform_buffer: wgpu::Buffer,
}

impl<'a> Renderer<'a> {
    pub fn new(window: &'a WebviewWindow) -> Self {
        let size = window.inner_size().unwrap();
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor::default());
        let surface = { instance.create_surface(window) }.unwrap();
        let adapter =
            pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions::default()))
                .unwrap();
        let (device, queue) =
            pollster::block_on(adapter.request_device(&wgpu::DeviceDescriptor::default())).unwrap();
        let surface_caps = surface.get_capabilities(&adapter);
        let surface_format = surface_caps
            .formats
            .iter()
            .copied()
            .find(|f| f.is_srgb())
            .unwrap_or(surface_caps.formats[0]);
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width: size.width,
            height: size.height,
            present_mode: surface_caps.present_modes[0],
            alpha_mode: surface_caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &config);

        let transform_uniforms = TransformUniforms {
            scale: [1.0, 1.0],
            offset: [0.0, 0.0],
        };
        let transform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Transform Buffer"),
            contents: bytemuck::cast_slice(&[transform_uniforms]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let render_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("render_bind_group_layout"),
                entries: &[
                    wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Texture {
                            multisampled: false,
                            view_dimension: wgpu::TextureViewDimension::D2,
                            sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        },
                        count: None,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 1,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                        count: None,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 2,
                        visibility: wgpu::ShaderStages::VERTEX,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Uniform,
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    },
                ],
            });

        let render_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("Render Pipeline Layout"),
                bind_group_layouts: &[&render_bind_group_layout],
                push_constant_ranges: &[],
            });

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
        });

        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Render Pipeline"),
            layout: Some(&render_pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                buffers: &[Vertex::desc()],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format: config.format,
                    blend: Some(wgpu::BlendState::REPLACE),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                ..Default::default()
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        });

        let vertex_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Vertex Buffer"),
            size: std::mem::size_of::<[Vertex; 6]>() as u64,
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let sampler = device.create_sampler(&wgpu::SamplerDescriptor::default());

        let initial_texture = load_texture_from_rgba(&device, &queue, &[0, 0, 255, 255], 1, 1);
        let initial_texture_view =
            initial_texture.create_view(&wgpu::TextureViewDescriptor::default());

        let render_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &render_bind_group_layout,
            label: Some("render_bind_group"),
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&initial_texture_view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: transform_buffer.as_entire_binding(),
                },
            ],
        });

        let s = Self {
            device,
            queue,
            surface,
            config,
            render_pipeline,
            vertex_buffer,
            render_bind_group_layout,
            render_bind_group,
            sampler,
            viewport: Mutex::new(Viewport {
                x: 0,
                y: 0,
                width: size.width,
                height: size.height,
            }),
            image_width: 1,
            image_height: 1,
            transform_uniforms,
            transform_buffer,
        };

        s.update_vertices();
        s
    }

    pub fn update_vertices(&self) {
        let viewport = self.viewport.lock().unwrap();
        if viewport.width == 0
            || viewport.height == 0
            || self.image_width == 0
            || self.image_height == 0
        {
            return;
        }

        let viewport_aspect = viewport.width as f32 / viewport.height as f32;
        let image_aspect = self.image_width as f32 / self.image_height as f32;

        let mut scale_x = 1.0;
        let mut scale_y = 1.0;

        if image_aspect > viewport_aspect {
            scale_y = viewport_aspect / image_aspect;
        } else {
            scale_x = image_aspect / viewport_aspect;
        }

        let vertices = [
            Vertex {
                position: [-scale_x, -scale_y, 0.0],
                tex_coords: [0.0, 1.0],
            },
            Vertex {
                position: [scale_x, -scale_y, 0.0],
                tex_coords: [1.0, 1.0],
            },
            Vertex {
                position: [-scale_x, scale_y, 0.0],
                tex_coords: [0.0, 0.0],
            },
            Vertex {
                position: [scale_x, scale_y, 0.0],
                tex_coords: [1.0, 0.0],
            },
        ];

        let quad = [
            vertices[0],
            vertices[1],
            vertices[2],
            vertices[1],
            vertices[3],
            vertices[2],
        ];

        self.queue
            .write_buffer(&self.vertex_buffer, 0, bytemuck::cast_slice(&quad));
    }

    pub fn resize(&mut self, new_width: u32, new_height: u32) {
        if new_width > 0 && new_height > 0 {
            self.config.width = new_width;
            self.config.height = new_height;
            self.surface.configure(&self.device, &self.config);
        }
    }

    pub fn render(&mut self) {
        let output = match self.surface.get_current_texture() {
            Ok(texture) => texture,
            Err(wgpu::SurfaceError::Outdated) => {
                self.resize(self.config.width, self.config.height);
                self.surface
                    .get_current_texture()
                    .expect("Failed to get texture after resize")
            }
            Err(e) => {
                error!("[Renderer] Failed to get current texture: {:?}", e);
                return;
            }
        };
        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());
        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Render Encoder"),
            });
        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                        store: wgpu::StoreOp::Store,
                    },
                    depth_slice: None,
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            let viewport = self.viewport.lock().unwrap();
            render_pass.set_viewport(
                viewport.x as f32,
                viewport.y as f32,
                viewport.width as f32,
                viewport.height as f32,
                0.0,
                1.0,
            );
            render_pass.set_scissor_rect(viewport.x, viewport.y, viewport.width, viewport.height);

            render_pass.set_pipeline(&self.render_pipeline);
            render_pass.set_bind_group(0, &self.render_bind_group, &[]);
            render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
            render_pass.draw(0..6, 0..1);
        }
        self.queue.submit(std::iter::once(encoder.finish()));
        output.present();
    }

    pub fn update_texture(&mut self, rgba: &[u8], width: u32, height: u32) {
        info!(
            "[Renderer] Updating texture with new image ({}x{})",
            width, height
        );
        let new_texture = load_texture_from_rgba(&self.device, &self.queue, rgba, width, height);
        let new_texture_view = new_texture.create_view(&wgpu::TextureViewDescriptor::default());

        self.render_bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &self.render_bind_group_layout,
            label: Some("render_bind_group"),
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&new_texture_view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&self.sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: self.transform_buffer.as_entire_binding(),
                },
            ],
        });

        self.image_width = width;
        self.image_height = height;
        self.update_vertices();
    }

    pub fn update_transform(&mut self, scale: f32, offset_x: f32, offset_y: f32) {
        self.transform_uniforms.scale = [scale, scale];
        self.transform_uniforms.offset = [offset_x, offset_y];
        self.queue.write_buffer(
            &self.transform_buffer,
            0,
            bytemuck::cast_slice(&[self.transform_uniforms]),
        );
        info!(
            "[Renderer] Updated transform: scale={}, offset=({},{})",
            scale, offset_x, offset_y
        );
    }
}

fn load_texture_from_rgba(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    rgba: &[u8],
    width: u32,
    height: u32,
) -> wgpu::Texture {
    let size = wgpu::Extent3d {
        width,
        height,
        depth_or_array_layers: 1,
    };
    let texture = device.create_texture(&wgpu::TextureDescriptor {
        label: Some("texture"),
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
    texture
}
