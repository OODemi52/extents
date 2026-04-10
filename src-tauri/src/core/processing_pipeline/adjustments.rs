use anyhow::Result;

use super::recipe::EditRecipe;
use super::types::ProcessingPipelineImage;

/// Applies an edit recipe to a canonical processing-pipeline image.
pub fn apply_adjustment(
    image: &ProcessingPipelineImage,
    recipe: &EditRecipe,
) -> Result<ProcessingPipelineImage> {
    let mut image = image.clone();

    if recipe.exposure_ev != 0.0 {
        apply_exposure(&mut image, recipe.exposure_ev);
    }

    Ok(image)
}

/// Applies an exposure adjustment in working space using EV stops.
fn apply_exposure(image: &mut ProcessingPipelineImage, exposure_ev: f32) {
    let gain = 2.0_f32.powf(exposure_ev);

    for pixel in image.color_mut().pixels_mut() {
        pixel.red *= gain;
        pixel.green *= gain;
        pixel.blue *= gain;
    }
}
