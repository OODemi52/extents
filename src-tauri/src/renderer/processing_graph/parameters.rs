use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Source-specific development parameters before GPU uniform packing.
#[derive(Debug, Copy, Clone)]
pub(in crate::renderer) enum DevelopmentParameters {
    Raster(RasterDevelopmentParameters),
    RawBayer(RawBayerDevelopmentParameters),
}

/// Development parameters for raster sRGB source input.
#[derive(Debug, Copy, Clone)]
pub(in crate::renderer) struct RasterDevelopmentParameters;

/// Development parameters for one-plane 2x2 Bayer RAW source input.
#[derive(Debug, Copy, Clone)]
pub(in crate::renderer) struct RawBayerDevelopmentParameters {
    cfa_pattern: [u32; 4],
    black_levels: [f32; 4],
    white_levels: [f32; 4],
    white_balance: [f32; 3],
    camera_to_working: [[f32; 3]; 3],
}

impl DevelopmentParameters {
    /// Packs neutral development parameters for raster sRGB source input.
    pub(in crate::renderer) fn from_raster_srgb() -> Self {
        Self::Raster(RasterDevelopmentParameters)
    }

    /// Packs source-development parameters for a one-plane 2x2 Bayer RAW source.
    pub(in crate::renderer) fn from_raw_bayer_2x2(
        cfa_pattern: [u32; 4],
        black_levels: [f32; 4],
        white_levels: [f32; 4],
        white_balance: [f32; 3],
        camera_to_working: [[f32; 3]; 3],
    ) -> Self {
        Self::RawBayer(RawBayerDevelopmentParameters {
            cfa_pattern,
            black_levels,
            white_levels,
            white_balance,
            camera_to_working,
        })
    }

    /// Returns the active 2x2 CFA pattern for RAW Bayer input, if present.
    pub(in crate::renderer) fn raw_bayer_cfa_pattern(self) -> Option<[u32; 4]> {
        match self {
            Self::Raster(_) => None,
            Self::RawBayer(parameters) => Some(parameters.cfa_pattern),
        }
    }

    fn to_uniform_block(self) -> DevelopmentUniformBlock {
        match self {
            Self::Raster(_) => DevelopmentUniformBlock::raster_srgb(),
            Self::RawBayer(parameters) => DevelopmentUniformBlock::raw_bayer(parameters),
        }
    }
}

impl Default for DevelopmentParameters {
    fn default() -> Self {
        Self::from_raster_srgb()
    }
}

/// Packed GPU uniform block consumed by development shaders.
///
/// This layout mirrors `shaders/development/development_bindings.wgsl`. It intentionally
/// remains separate from source-specific Rust parameters so CPU routing and
/// shader memory layout can evolve independently.
#[repr(C)]
#[derive(Debug, Copy, Clone, Pod, Zeroable)]
struct DevelopmentUniformBlock {
    cfa_pattern: [u32; 4],
    black_levels: [f32; 4],
    white_levels: [f32; 4],
    white_balance: [f32; 4],
    camera_to_working_red: [f32; 4],
    camera_to_working_green: [f32; 4],
    camera_to_working_blue: [f32; 4],
}

impl DevelopmentUniformBlock {
    fn raster_srgb() -> Self {
        Self {
            cfa_pattern: [0, 0, 0, 0],
            black_levels: [0.0, 0.0, 0.0, 0.0],
            white_levels: [1.0, 1.0, 1.0, 1.0],
            white_balance: [1.0, 1.0, 1.0, 0.0],
            camera_to_working_red: [1.0, 0.0, 0.0, 0.0],
            camera_to_working_green: [0.0, 1.0, 0.0, 0.0],
            camera_to_working_blue: [0.0, 0.0, 1.0, 0.0],
        }
    }

    fn raw_bayer(parameters: RawBayerDevelopmentParameters) -> Self {
        Self {
            cfa_pattern: parameters.cfa_pattern,
            black_levels: parameters.black_levels,
            white_levels: parameters.white_levels,
            white_balance: [
                parameters.white_balance[0],
                parameters.white_balance[1],
                parameters.white_balance[2],
                0.0,
            ],
            camera_to_working_red: [
                parameters.camera_to_working[0][0],
                parameters.camera_to_working[0][1],
                parameters.camera_to_working[0][2],
                0.0,
            ],
            camera_to_working_green: [
                parameters.camera_to_working[1][0],
                parameters.camera_to_working[1][1],
                parameters.camera_to_working[1][2],
                0.0,
            ],
            camera_to_working_blue: [
                parameters.camera_to_working[2][0],
                parameters.camera_to_working[2][1],
                parameters.camera_to_working[2][2],
                0.0,
            ],
        }
    }
}

impl Default for DevelopmentUniformBlock {
    fn default() -> Self {
        Self::raster_srgb()
    }
}

/// GPU uniform buffer for graph-owned development parameters.
pub(super) struct DevelopmentParametersBuffer {
    parameters: DevelopmentUniformBlock,
    buffer: wgpu::Buffer,
}

impl DevelopmentParametersBuffer {
    /// Creates a uniform buffer initialized with neutral development parameters.
    pub(super) fn new(device: &wgpu::Device) -> Self {
        let parameters = DevelopmentUniformBlock::default();

        let buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Development Parameters Buffer"),
            contents: bytemuck::cast_slice(&[parameters]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        Self { parameters, buffer }
    }

    /// Updates the live development parameters used by graph stages.
    pub(super) fn update(&mut self, queue: &wgpu::Queue, parameters: DevelopmentParameters) {
        self.parameters = parameters.to_uniform_block();

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
    render: [f32; 4],
}

impl OutputTransformParameters {
    /// Packs the current output transform settings into a uniform block.
    pub(super) fn from_output_transform(display_intent: u32, base_exposure_ev: f32) -> Self {
        Self {
            display: [display_intent, 0, 0, 0],
            render: [base_exposure_ev, 0.0, 0.0, 0.0],
        }
    }
}

impl Default for OutputTransformParameters {
    fn default() -> Self {
        Self {
            display: [0; 4],
            render: [0.0; 4],
        }
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
