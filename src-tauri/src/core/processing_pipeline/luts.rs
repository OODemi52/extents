use std::sync::LazyLock;

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

/// Converts an 8-bit sRGB channel value to linear light via lookup.
pub(super) fn srgb_u8_to_linear(value: u8) -> f32 {
    SRGB_U8_TO_LINEAR_LUT[value as usize]
}
