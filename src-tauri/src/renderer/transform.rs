use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub struct TransformUniforms {
    pub scale: [f32; 2],
    pub offset: [f32; 2],
}

impl Default for TransformUniforms {
    fn default() -> Self {
        Self {
            scale: [1.0, 1.0],
            offset: [0.0, 0.0],
        }
    }
}

pub struct TransformBuffer {
    uniforms: TransformUniforms,
    buffer: wgpu::Buffer,
}

impl TransformBuffer {
    pub fn new(device: &wgpu::Device) -> Self {
        let uniforms = TransformUniforms::default();

        let buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Transform Buffer"),
            contents: bytemuck::cast_slice(&[uniforms]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        Self { uniforms, buffer }
    }

    pub fn update(&mut self, queue: &wgpu::Queue, scale: f32, offset_x: f32, offset_y: f32) {
        self.uniforms.scale = [scale, scale];

        self.uniforms.offset = [offset_x, offset_y];

        queue.write_buffer(&self.buffer, 0, bytemuck::cast_slice(&[self.uniforms]));
    }

    pub fn get(&self) -> &TransformUniforms {
        &self.uniforms
    }

    pub fn as_entire_binding(&self) -> wgpu::BindingResource {
        self.buffer.as_entire_binding()
    }
}
