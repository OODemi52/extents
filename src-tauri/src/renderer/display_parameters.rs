use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Shader-facing display parameters used to render the working image.
/// DO NOT FORGET TO CHANGE PADDING ON STRUCT AND IMPL WHEN UPDATING.
/// Keep to 16 byte chunks
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub struct DisplayParameters {
    display: [u32; 4],
}

impl Default for DisplayParameters {
    fn default() -> Self {
        Self { display: [0; 4] }
    }
}

impl DisplayParameters {
    /// Builds shader-facing display parameters from display-only renderer state.
    pub fn from_intent(display_render_intent: u32) -> Self {
        Self {
            display: [display_render_intent, 0, 0, 0],
        }
    }

    /// Returns the shader display-render intent.
    pub fn display_render_intent(&self) -> u32 {
        self.display[0]
    }

    /// Updates the shader display-render intent while preserving padding.
    pub fn set_display_render_intent(&mut self, display_render_intent: u32) {
        self.display[0] = display_render_intent;
    }
}

/// GPU uniform buffer wrapper for live display parameters.
pub struct DisplayParametersBuffer {
    parameters: DisplayParameters,
    buffer: wgpu::Buffer,
}

impl DisplayParametersBuffer {
    pub fn new(device: &wgpu::Device) -> Self {
        let parameters = DisplayParameters::default();

        let buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Display Parameters Buffer"),
            contents: bytemuck::cast_slice(&[parameters]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        Self { parameters, buffer }
    }

    /// Updates the live display parameters used by the fragment shader.
    pub fn update(&mut self, queue: &wgpu::Queue, parameters: DisplayParameters) {
        self.parameters = parameters;

        queue.write_buffer(&self.buffer, 0, bytemuck::cast_slice(&[self.parameters]));
    }

    /// Returns the current CPU-side display parameter snapshot.
    pub fn parameters(&self) -> DisplayParameters {
        self.parameters
    }

    /// Returns the display-parameter buffer as a bindable uniform resource.
    pub fn as_entire_binding(&self) -> wgpu::BindingResource<'_> {
        self.buffer.as_entire_binding()
    }
}
