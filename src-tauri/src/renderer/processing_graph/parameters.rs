use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Graph-owned development parameters consumed by GPU development stages.
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub(super) struct DevelopmentParameters {
    source: [u32; 4],
}

impl Default for DevelopmentParameters {
    fn default() -> Self {
        Self { source: [0; 4] }
    }
}

/// GPU uniform buffer for graph-owned development parameters.
pub(super) struct DevelopmentParametersBuffer {
    buffer: wgpu::Buffer,
}

impl DevelopmentParametersBuffer {
    /// Creates a uniform buffer initialized with neutral development parameters.
    pub(super) fn new(device: &wgpu::Device) -> Self {
        let parameters = DevelopmentParameters::default();

        let buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Development Parameters Buffer"),
            contents: bytemuck::cast_slice(&[parameters]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        Self { buffer }
    }

    /// Returns this buffer as a bindable uniform resource.
    pub(super) fn as_entire_binding(&self) -> wgpu::BindingResource<'_> {
        self.buffer.as_entire_binding()
    }
}

/// Graph-owned adjustment parameters consumed by GPU adjustment stages.
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub(super) struct AdjustmentParameters {
    exposure: [f32; 4],
}

impl AdjustmentParameters {
    /// Packs the current exposure value into a 16-byte uniform block.
    pub(super) fn from_exposure_ev(exposure_ev: f32) -> Self {
        Self {
            exposure: [exposure_ev, 0.0, 0.0, 0.0],
        }
    }
}

impl Default for AdjustmentParameters {
    fn default() -> Self {
        Self { exposure: [0.0; 4] }
    }
}

/// GPU uniform buffer for graph-owned adjustment parameters.
pub(super) struct AdjustmentParametersBuffer {
    parameters: AdjustmentParameters,
    buffer: wgpu::Buffer,
}

impl AdjustmentParametersBuffer {
    /// Creates a uniform buffer initialized with neutral adjustment parameters.
    pub(super) fn new(device: &wgpu::Device) -> Self {
        let parameters = AdjustmentParameters::default();

        let buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Adjustment Parameters Buffer"),
            contents: bytemuck::cast_slice(&[parameters]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        Self { parameters, buffer }
    }

    /// Updates the live adjustment parameters used by graph stages.
    pub(super) fn update(&mut self, queue: &wgpu::Queue, parameters: AdjustmentParameters) {
        self.parameters = parameters;

        queue.write_buffer(&self.buffer, 0, bytemuck::cast_slice(&[self.parameters]));
    }

    /// Returns this buffer as a bindable uniform resource.
    pub(super) fn as_entire_binding(&self) -> wgpu::BindingResource<'_> {
        self.buffer.as_entire_binding()
    }
}

/// Graph-owned output transform parameters consumed by the display-output stage.
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub(super) struct OutputTransformParameters {
    display: [u32; 4],
}

impl OutputTransformParameters {
    /// Packs the current display render intent into a 16-byte uniform block.
    pub(super) fn from_display_render_intent(display_render_intent: u32) -> Self {
        Self {
            display: [display_render_intent, 0, 0, 0],
        }
    }
}

impl Default for OutputTransformParameters {
    fn default() -> Self {
        Self { display: [0; 4] }
    }
}

/// GPU uniform buffer for graph-owned output transform parameters.
pub(super) struct OutputTransformParametersBuffer {
    parameters: OutputTransformParameters,
    buffer: wgpu::Buffer,
}

impl OutputTransformParametersBuffer {
    /// Creates a uniform buffer initialized with neutral output transform parameters.
    pub(super) fn new(device: &wgpu::Device) -> Self {
        let parameters = OutputTransformParameters::default();

        let buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Output Transform Parameters Buffer"),
            contents: bytemuck::cast_slice(&[parameters]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        Self { parameters, buffer }
    }

    /// Updates the live output transform parameters used by graph stages.
    pub(super) fn update(&mut self, queue: &wgpu::Queue, parameters: OutputTransformParameters) {
        self.parameters = parameters;

        queue.write_buffer(&self.buffer, 0, bytemuck::cast_slice(&[self.parameters]));
    }

    /// Returns this buffer as a bindable uniform resource.
    pub(super) fn as_entire_binding(&self) -> wgpu::BindingResource<'_> {
        self.buffer.as_entire_binding()
    }
}
