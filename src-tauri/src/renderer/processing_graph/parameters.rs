use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Identifies the source-domain interpretation used by the development stage.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(in crate::renderer) enum SourceKind {
    RasterSrgb,
    RawBayer2x2,
}

impl SourceKind {
    fn as_u32(self) -> u32 {
        match self {
            Self::RasterSrgb => 0,
            Self::RawBayer2x2 => 1,
        }
    }
}

/// Graph-owned development parameters consumed by GPU development stages.
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
pub(in crate::renderer) struct DevelopmentParameters {
    source: [u32; 4],
    cfa_pattern: [u32; 4],
    black_levels: [f32; 4],
    white_levels: [f32; 4],
    white_balance: [f32; 4],
    camera_to_working_red: [f32; 4],
    camera_to_working_green: [f32; 4],
    camera_to_working_blue: [f32; 4],
}

impl DevelopmentParameters {
    /// Packs the current source kind with neutral source-development parameters.
    pub(in crate::renderer) fn from_source_kind(source_kind: SourceKind) -> Self {
        Self {
            source: [source_kind.as_u32(), 0, 0, 0],
            cfa_pattern: [0, 0, 0, 0],
            black_levels: [0.0, 0.0, 0.0, 0.0],
            white_levels: [1.0, 1.0, 1.0, 1.0],
            white_balance: [1.0, 1.0, 1.0, 0.0],
            camera_to_working_red: [1.0, 0.0, 0.0, 0.0],
            camera_to_working_green: [0.0, 1.0, 0.0, 0.0],
            camera_to_working_blue: [0.0, 0.0, 1.0, 0.0],
        }
    }

    /// Packs source-development parameters for a one-plane 2x2 Bayer RAW source.
    pub(in crate::renderer) fn from_raw_bayer_2x2(
        cfa_pattern: [u32; 4],
        black_levels: [f32; 4],
        white_levels: [f32; 4],
        white_balance: [f32; 3],
        camera_to_working: [[f32; 3]; 3],
    ) -> Self {
        Self {
            source: [SourceKind::RawBayer2x2.as_u32(), 0, 0, 0],
            cfa_pattern,
            black_levels,
            white_levels,
            white_balance: [white_balance[0], white_balance[1], white_balance[2], 0.0],
            camera_to_working_red: [
                camera_to_working[0][0],
                camera_to_working[0][1],
                camera_to_working[0][2],
                0.0,
            ],
            camera_to_working_green: [
                camera_to_working[1][0],
                camera_to_working[1][1],
                camera_to_working[1][2],
                0.0,
            ],
            camera_to_working_blue: [
                camera_to_working[2][0],
                camera_to_working[2][1],
                camera_to_working[2][2],
                0.0,
            ],
        }
    }

    /// Returns how the development graph should interpret the source texture.
    pub(in crate::renderer) fn source_kind(self) -> SourceKind {
        match self.source[0] {
            1 => SourceKind::RawBayer2x2,
            _ => SourceKind::RasterSrgb,
        }
    }
}

impl Default for DevelopmentParameters {
    fn default() -> Self {
        Self::from_source_kind(SourceKind::RasterSrgb)
    }
}

/// GPU uniform buffer for graph-owned development parameters.
pub(super) struct DevelopmentParametersBuffer {
    parameters: DevelopmentParameters,
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

        Self { parameters, buffer }
    }

    /// Updates the live development parameters used by graph stages.
    pub(super) fn update(&mut self, queue: &wgpu::Queue, parameters: DevelopmentParameters) {
        self.parameters = parameters;

        queue.write_buffer(&self.buffer, 0, bytemuck::cast_slice(&[self.parameters]));
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
    /// Packs the current display intent into a 16-byte uniform block.
    pub(super) fn from_display_intent(display_intent: u32) -> Self {
        Self {
            display: [display_intent, 0, 0, 0],
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
