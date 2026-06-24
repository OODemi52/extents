use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

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
