use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Shader-facing display parameters used to render the working image.
/// DO NOT FORGET TO CHANGE PADDING ON STRUCT AND IMPL WHEN UPDATING.
/// Keep to 16 byte chunks
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub struct DisplayParamsUniforms {
    pub exposure_ev: f32,
    pub display_render_intent: u32,
    pub _padding: [u32; 2],
}

impl Default for DisplayParamsUniforms {
    fn default() -> Self {
        Self {
            exposure_ev: 0.0,
            display_render_intent: 0,
            _padding: [0, 0],
        }
    }
}

/// GPU uniform buffer wrapper for live display parameters.
pub struct DisplayParamsBuffer {
    uniforms: DisplayParamsUniforms,
    buffer: wgpu::Buffer,
}

impl DisplayParamsBuffer {
    pub fn new(device: &wgpu::Device) -> Self {
        let uniforms = DisplayParamsUniforms::default();

        let buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Display Params Buffer"),
            contents: bytemuck::cast_slice(&[uniforms]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        Self { uniforms, buffer }
    }

    /// Updates the live display parameters used by the fragment shader.
    pub fn update(&mut self, queue: &wgpu::Queue, uniforms: DisplayParamsUniforms) {
        self.uniforms = uniforms;

        queue.write_buffer(&self.buffer, 0, bytemuck::cast_slice(&[self.uniforms]));
    }

    /// Returns the display-parameter buffer as a bindable uniform resource.
    pub fn as_entire_binding(&self) -> wgpu::BindingResource {
        self.buffer.as_entire_binding()
    }
}
