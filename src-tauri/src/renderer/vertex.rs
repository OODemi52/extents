use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable)]
pub struct Vertex {
    position: [f32; 3],
    tex_coords: [f32; 2],
}

impl Vertex {
    /// Create a new vertex
    pub fn new(position: [f32; 3], tex_coords: [f32; 2]) -> Self {
        Self {
            position,
            tex_coords,
        }
    }

    /// Get the vertex buffer layout descriptor
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

/// Manages the vertex buffer for rendering
pub struct VertexBuffer {
    buffer: wgpu::Buffer,
}

impl VertexBuffer {
    /// Create a new vertex buffer
    pub fn new(device: &wgpu::Device) -> Self {
        let buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Vertex Buffer"),
            size: std::mem::size_of::<[Vertex; 6]>() as u64,
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        Self { buffer }
    }

    /// Update vertex buffer with a quad that maintains aspect ratio
    pub fn update_for_aspect_ratio(
        &self,
        queue: &wgpu::Queue,
        viewport_width: u32,
        viewport_height: u32,
        image_width: u32,
        image_height: u32,
    ) {
        if viewport_width == 0 || viewport_height == 0 || image_width == 0 || image_height == 0 {
            return;
        }

        let viewport_aspect = viewport_width as f32 / viewport_height as f32;
        let image_aspect = image_width as f32 / image_height as f32;

        let (scale_x, scale_y) = if image_aspect > viewport_aspect {
            (1.0, viewport_aspect / image_aspect)
        } else {
            (image_aspect / viewport_aspect, 1.0)
        };

        let vertices = [
            Vertex::new([-scale_x, -scale_y, 0.0], [0.0, 1.0]),
            Vertex::new([scale_x, -scale_y, 0.0], [1.0, 1.0]),
            Vertex::new([-scale_x, scale_y, 0.0], [0.0, 0.0]),
            Vertex::new([scale_x, scale_y, 0.0], [1.0, 0.0]),
        ];

        // Create two triangles to form a quad
        let quad = [
            vertices[0],
            vertices[1],
            vertices[2],
            vertices[1],
            vertices[3],
            vertices[2],
        ];

        queue.write_buffer(&self.buffer, 0, bytemuck::cast_slice(&quad));
    }

    /// Get a slice of the entire buffer
    pub fn slice(&self) -> wgpu::BufferSlice {
        self.buffer.slice(..)
    }
}
