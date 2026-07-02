use super::input::RawSourceMetadata;

/// Current renderer and pipeline state exposed to the Inspector workspace.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectionSnapshot {
    pub has_image: bool,
    pub image: Option<ImageInspection>,
    pub pipeline: PipelineInspection,
    pub textures: TextureInspection,
    pub timings: TimingInspection,
}

impl InspectionSnapshot {
    /// Builds an empty snapshot before any source image has been loaded.
    pub(in crate::renderer) fn empty(
        surface_format: wgpu::TextureFormat,
        surface_width: u32,
        surface_height: u32,
    ) -> Self {
        Self {
            has_image: false,
            image: None,
            pipeline: PipelineInspection::default(),
            textures: TextureInspection::empty(surface_format, surface_width, surface_height),
            timings: TimingInspection::default(),
        }
    }
}

/// Source image details for the active renderer input.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageInspection {
    pub source_kind: String,
    pub width: u32,
    pub height: u32,
    pub has_transparency: bool,
    pub raw: Option<RawImageInspection>,
}

/// RAW-specific source details for the active renderer input.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RawImageInspection {
    pub camera_make: String,
    pub camera_model: String,
    pub bits_per_sample: u32,
    pub sensor_dimensions: DimensionsInspection,
    pub crop_area: RectInspection,
    pub cfa: CfaPatternInspection,
    pub source_black_levels: [f32; 4],
    pub source_white_levels: [f32; 4],
    pub normalized_black_levels: [f32; 4],
    pub normalized_white_levels: [f32; 4],
    pub as_shot_white_balance: [f32; 4],
    pub headroom_white_balance: [f32; 3],
}

impl RawImageInspection {
    /// Builds RAW image inspection data from the active renderer RAW metadata.
    pub(in crate::renderer) fn from_source_metadata(metadata: &RawSourceMetadata) -> Self {
        Self {
            camera_make: metadata.camera_make.clone(),
            camera_model: metadata.camera_model.clone(),
            bits_per_sample: metadata.bits_per_sample,
            sensor_dimensions: DimensionsInspection {
                width: metadata.sensor_dimensions.width(),
                height: metadata.sensor_dimensions.height(),
            },
            crop_area: RectInspection {
                x: metadata.crop_area.x,
                y: metadata.crop_area.y,
                width: metadata.crop_area.width,
                height: metadata.crop_area.height,
            },
            cfa: CfaPatternInspection::from_bayer_cfa_pattern(metadata.cfa_pattern),
            source_black_levels: metadata.source_black_levels,
            source_white_levels: metadata.source_white_levels,
            normalized_black_levels: metadata.normalized_black_levels,
            normalized_white_levels: metadata.normalized_white_levels,
            as_shot_white_balance: metadata.as_shot_white_balance,
            headroom_white_balance: metadata.headroom_white_balance,
        }
    }
}

/// A two-dimensional size exposed to the Inspector.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DimensionsInspection {
    pub width: u32,
    pub height: u32,
}

/// A rectangle exposed to the Inspector.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RectInspection {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/// A repeating color-filter-array pattern.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CfaPatternInspection {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub cells: [CfaCellInspection; 4],
}

impl CfaPatternInspection {
    fn from_bayer_cfa_pattern(pattern: [u32; 4]) -> Self {
        let cells = [
            CfaCellInspection::from_color_code(pattern[0]),
            CfaCellInspection::from_color_code(pattern[1]),
            CfaCellInspection::from_color_code(pattern[2]),
            CfaCellInspection::from_color_code(pattern[3]),
        ];

        Self {
            name: cfa_pattern_name(&cells),
            width: 2,
            height: 2,
            cells,
        }
    }
}

/// One CFA cell in row-major order.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CfaCellInspection {
    pub code: u32,
    pub label: String,
}

impl CfaCellInspection {
    fn from_color_code(code: u32) -> Self {
        Self {
            code,
            label: cfa_color_label(code).to_string(),
        }
    }
}

/// Active processing and display settings.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineInspection {
    pub development_source: String,
    pub display_intent: String,
    pub base_exposure_ev: Option<f32>,
    pub user_exposure_ev: f32,
}

impl Default for PipelineInspection {
    fn default() -> Self {
        Self {
            development_source: "-".to_string(),
            display_intent: "-".to_string(),
            base_exposure_ev: None,
            user_exposure_ev: 0.0,
        }
    }
}

/// Texture state for graph and presentation resources.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextureInspection {
    pub source: TextureResourceInspection,
    pub development_output: TextureResourceInspection,
    pub adjustment_output: TextureResourceInspection,
    pub display_output: TextureResourceInspection,
    pub surface: TextureResourceInspection,
}

impl TextureInspection {
    fn empty(surface_format: wgpu::TextureFormat, surface_width: u32, surface_height: u32) -> Self {
        Self {
            source: TextureResourceInspection::placeholder("Source Image Texture"),
            development_output: TextureResourceInspection::placeholder(
                "Development Output Texture",
            ),
            adjustment_output: TextureResourceInspection::placeholder("Adjustment Output Texture"),
            display_output: TextureResourceInspection::placeholder("Display Output Texture"),
            surface: TextureResourceInspection::new(
                "Window Surface",
                surface_format,
                surface_width,
                surface_height,
            ),
        }
    }
}

/// One texture-like resource exposed in the Inspector.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextureResourceInspection {
    pub label: String,
    pub format: String,
    pub width: u32,
    pub height: u32,
}

impl TextureResourceInspection {
    pub(in crate::renderer) fn new(
        label: impl Into<String>,
        format: wgpu::TextureFormat,
        width: u32,
        height: u32,
    ) -> Self {
        Self {
            label: label.into(),
            format: format!("{format:?}"),
            width,
            height,
        }
    }

    fn placeholder(label: impl Into<String>) -> Self {
        Self {
            label: label.into(),
            format: "-".to_string(),
            width: 0,
            height: 0,
        }
    }
}

/// Last observed CPU-side timing for building the active renderer input.
#[derive(Debug, Clone, Copy, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimingInspection {
    pub input_build_ms: Option<f64>,
}

fn cfa_color_label(code: u32) -> &'static str {
    match code {
        0 => "R",
        1 => "G",
        2 => "B",
        _ => "?",
    }
}

fn cfa_pattern_name(cells: &[CfaCellInspection; 4]) -> String {
    let mut name = String::with_capacity(4);

    for cell in cells {
        name.push_str(&cell.label);
    }

    name
}
