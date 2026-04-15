/// User-editable processing parameters applied to a canonical pipeline image.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct EditRecipe {
    pub exposure_ev: f32,
}
