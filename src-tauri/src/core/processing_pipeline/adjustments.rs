use anyhow::Result;

use super::recipe::EditRecipe;
use super::types::ProcessingPipelineImage;

/// Applies an edit recipe to a canonical processing-pipeline image.
pub fn apply_adjustment(
    image: &ProcessingPipelineImage,
    _recipe: &EditRecipe,
) -> Result<ProcessingPipelineImage> {
    Ok(image.clone())
}
