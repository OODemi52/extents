use crate::core::editing::EditRecipe;
use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Shader-facing display parameters used to render the working image.
/// DO NOT FORGET TO CHANGE PADDING ON STRUCT AND IMPL WHEN UPDATING.
/// Keep to 16 byte chunks
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub struct DisplayParameters {
    pub exposure_ev: f32,
    pub display_render_intent: u32,
    pub debug_view: u32,
    pub _padding: u32,
}

impl Default for DisplayParameters {
    fn default() -> Self {
        Self {
            exposure_ev: 0.0,
            display_render_intent: 0,
            debug_view: 0,
            _padding: 0,
        }
    }
}

impl DisplayParameters {
    /// Builds a shader-facing display-parameter snapshot from the current recipe
    /// and the image-derived display render intent.
    pub fn from_recipe_intent_and_debug_view(
        recipe: &EditRecipe,
        display_render_intent: u32,
        debug_view: u32,
    ) -> Self {
        Self {
            exposure_ev: recipe.exposure_ev,
            display_render_intent,
            debug_view,
            _padding: 0,
        }
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
