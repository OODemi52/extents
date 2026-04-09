use std::sync::LazyLock;

const LINEAR_TO_SRGB8_LUT_SIZE: usize = 4096;

/// Lookup table for converting 8-bit sRGB channel values to linear light.
static SRGB_U8_TO_LINEAR_LUT: LazyLock<[f32; 256]> = LazyLock::new(|| {
    std::array::from_fn(|value| {
        let normalized = value as f32 / 255.0;

        if normalized <= 0.04045 {
            normalized / 12.92
        } else {
            ((normalized + 0.055) / 1.055).powf(2.4)
        }
    })
});

/// Lookup table for encoding clamped linear sRGB values to 8-bit sRGB.
static LINEAR_TO_SRGB8_LUT: LazyLock<[u8; LINEAR_TO_SRGB8_LUT_SIZE + 1]> =
    LazyLock::new(|| {
        std::array::from_fn(|index| {
            let linear = index as f32 / LINEAR_TO_SRGB8_LUT_SIZE as f32;

            let srgb = if linear <= 0.003_130_8 {
                linear * 12.92
            } else {
                (1.055 * linear.powf(1.0 / 2.4)) - 0.055
            };

            (srgb * 255.0).round() as u8
        })
    });

/// Converts an 8-bit sRGB channel value to linear light via lookup.
pub(super) fn srgb_u8_to_linear(value: u8) -> f32 {
    SRGB_U8_TO_LINEAR_LUT[value as usize]
}

/// Converts a linear sRGB channel value to an 8-bit sRGB output value via lookup.
///
/// Input values are clamped to the display-safe range `0.0..=1.0` before lookup.
pub(super) fn linear_to_srgb8(channel: f32) -> u8 {
    let clamped = clamp_unit_f32(channel);
    let index = (clamped * LINEAR_TO_SRGB8_LUT_SIZE as f32).round() as usize;
    LINEAR_TO_SRGB8_LUT[index]
}

fn clamp_unit_f32(value: f32) -> f32 {
    if value < 0.0 {
        0.0
    } else if value > 1.0 {
        1.0
    } else {
        value
    }
}
