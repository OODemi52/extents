use anyhow::{ensure, Result};

/// User-editable processing parameters applied to a canonical pipeline image.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct EditRecipe {
    pub exposure_ev: f32,
}

impl EditRecipe {
    /// Checks that these parameters can be applied by the processing graph.
    pub fn validate(&self) -> Result<()> {
        let multiplier = self.exposure_ev.exp2();
        ensure!(
            self.exposure_ev.is_finite() && multiplier.is_finite() && multiplier > 0.0,
            "exposure must produce a finite, positive multiplier"
        );
        Ok(())
    }
}
