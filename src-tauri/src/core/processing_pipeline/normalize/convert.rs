use crate::core::processing_pipeline::types::RgbPixel;

/// Converts a linear sRGB pixel to the linear Rec.2020 working space.
pub(super) fn linear_srgb_to_linear_rec2020(pixel: RgbPixel) -> RgbPixel {
    RgbPixel {
        red: (0.627_404 * pixel.red) + (0.329_283 * pixel.green) + (0.043_313 * pixel.blue),
        green: (0.069_097 * pixel.red) + (0.919_540 * pixel.green) + (0.011_362 * pixel.blue),
        blue: (0.016_391 * pixel.red) + (0.088_013 * pixel.green) + (0.895_595 * pixel.blue),
    }
}
