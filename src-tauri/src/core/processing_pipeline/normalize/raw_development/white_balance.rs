use rawler::RawImage;

use super::types::CameraSpaceRgbPixel;

/// Describes where resolved RGB white-balance gains came from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum RgbWbGainsSource {
    AsShotMetadata,
    IdentityFallback,
}

/// White-balance gains for a demosaiced three-channel camera-space RGB image.
#[derive(Debug, Clone, Copy, PartialEq)]
struct RgbWbGains {
    gains: [f32; 3],
    source: RgbWbGainsSource,
}

impl RgbWbGains {
    /// Creates RGB white-balance gains with an explicit source.
    fn new(gains: [f32; 3], source: RgbWbGainsSource) -> Self {
        Self { gains, source }
    }

    /// Returns the multiplicative RGB channel gains.
    fn gains(&self) -> [f32; 3] {
        self.gains
    }

    /// Returns where these white-balance gains came from.
    fn source(&self) -> RgbWbGainsSource {
        self.source
    }
}

/// Resolved RAW white balance for a demosaiced camera-space RGB image.
///
/// This preserves the original as-shot RGB gains and the headroom-normalized
/// gains currently used by the development pipeline. `base_gain` records the
/// common scalar used to normalize the as-shot gains.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(super) struct RawWhiteBalance {
    as_shot_rgb_gains: [f32; 3],
    headroom_rgb_gains: [f32; 3],
    base_gain: f32,
    source: RgbWbGainsSource,
}

impl RawWhiteBalance {
    /// Creates resolved RAW white balance.
    fn new(
        as_shot_rgb_gains: [f32; 3],
        headroom_rgb_gains: [f32; 3],
        base_gain: f32,
        source: RgbWbGainsSource,
    ) -> Self {
        Self {
            as_shot_rgb_gains,
            headroom_rgb_gains,
            base_gain,
            source,
        }
    }

    /// Applies the headroom-normalized white balance to a camera-space RGB pixel.
    pub(super) fn apply_to_camera_space_rgb(
        &self,
        pixel: CameraSpaceRgbPixel,
    ) -> CameraSpaceRgbPixel {
        apply_rgb_wb_gains(pixel, self.headroom_rgb_gains)
    }
}

/// Resolves the RAW file's as-shot white-balance metadata into RGB gains.
///
/// `rawler` stores white-balance coefficients in a four-slot metadata shape.
/// The current RAW pipeline only accepts three-channel demosaiced camera-space
/// RGB images, so this function validates and narrows the metadata to RGB.
fn resolve_as_shot_rgb_wb_gains(raw_image: &RawImage) -> RgbWbGains {
    resolve_rgb_wb_gains(raw_image.wb_coeffs)
}

/// Resolves as-shot RAW white balance and prepares the gains used by the pipeline.
pub(super) fn resolve_raw_white_balance(raw_image: &RawImage) -> RawWhiteBalance {
    let wb_gains = resolve_as_shot_rgb_wb_gains(raw_image);
    let as_shot_rgb_gains = wb_gains.gains();
    let (headroom_rgb_gains, base_gain, source) = normalize_rgb_wb_gains_for_headroom(wb_gains);

    RawWhiteBalance::new(as_shot_rgb_gains, headroom_rgb_gains, base_gain, source)
}

/// Normalizes RGB white-balance gains so no channel gain exceeds `1.0`.
///
/// This preserves highlight headroom by dividing all gains by the largest
/// valid channel gain. The returned `base_gain` records that common scalar so
/// later pipeline stages can account for the brightness tradeoff.
fn normalize_rgb_wb_gains_for_headroom(wb_gains: RgbWbGains) -> ([f32; 3], f32, RgbWbGainsSource) {
    let gains = wb_gains.gains();
    let max_wb_gain = gains.into_iter().fold(f32::NEG_INFINITY, f32::max);

    if !max_wb_gain.is_finite() || max_wb_gain <= 0.0 {
        return ([1.0, 1.0, 1.0], 1.0, RgbWbGainsSource::IdentityFallback);
    }

    let base_gain = 1.0 / max_wb_gain;

    let normalized_gains = gains.map(|gain| gain * base_gain);

    (normalized_gains, base_gain, wb_gains.source())
}

/// Applies RGB white-balance gains to a camera-space RGB pixel.
fn apply_rgb_wb_gains(pixel: CameraSpaceRgbPixel, gains: [f32; 3]) -> CameraSpaceRgbPixel {
    CameraSpaceRgbPixel {
        red: pixel.red * gains[0],
        green: pixel.green * gains[1],
        blue: pixel.blue * gains[2],
    }
}

/// Validates rawler white-balance coefficients and extracts RGB gains.
fn resolve_rgb_wb_gains(wb_coeffs: [f32; 4]) -> RgbWbGains {
    let gains = [wb_coeffs[0], wb_coeffs[1], wb_coeffs[2]];

    if gains.iter().all(|gain| gain.is_finite() && *gain > 0.0) {
        RgbWbGains::new(gains, RgbWbGainsSource::AsShotMetadata)
    } else {
        RgbWbGains::new([1.0, 1.0, 1.0], RgbWbGainsSource::IdentityFallback)
    }
}
