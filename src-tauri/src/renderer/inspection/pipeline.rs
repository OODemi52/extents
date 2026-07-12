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
