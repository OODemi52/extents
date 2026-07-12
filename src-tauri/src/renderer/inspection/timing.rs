/// Last observed CPU-side timing for building the active renderer input.
/// Note, curently this only gathers the input timing as we need to look into
/// timestamp queries.
#[derive(Debug, Clone, Copy, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimingInspection {
    pub input_build_ms: Option<f64>,
}
