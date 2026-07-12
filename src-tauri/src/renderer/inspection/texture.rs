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
    pub(in crate::renderer) fn empty(
        surface_format: wgpu::TextureFormat,
        surface_width: u32,
        surface_height: u32,
    ) -> Self {
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
