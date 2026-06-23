use super::viewport::Viewport;

/// Shader transform values derived from the current viewer state.
///
/// This is the CPU-side shape passed into the display transform uniform after
/// viewport placement, fit scale, user pan/zoom, and checkerboard state are resolved.
pub(super) struct ViewerTransform {
    pub(super) scale: f32,
    pub(super) offset_x: f32,
    pub(super) offset_y: f32,
    pub(super) checkerboard_enabled: f32,
}

/// Interactive image-view state independent of GPU resource ownership.
///
/// The viewer state tracks the logical interaction viewport, user pan/zoom
/// values, image fit scale, and display-only toggles. It can then derive the
/// normalized transform values consumed by the display shader.
pub(super) struct ViewerState {
    viewport: Viewport,
    user_scale: f32,
    user_offset_x: f32,
    user_offset_y: f32,
    checkerboard_enabled: f32,
    image_quad_scale_x: f32,
    image_quad_scale_y: f32,
    fit_scale: f32,
}

impl ViewerState {
    /// Creates viewer state with a viewport matching the initial window size.
    pub(super) fn new(window_width: u32, window_height: u32) -> Self {
        Self {
            viewport: Viewport::new(0, 0, window_width, window_height),
            user_scale: 1.0,
            user_offset_x: 0.0,
            user_offset_y: 0.0,
            checkerboard_enabled: 0.0,
            image_quad_scale_x: 1.0,
            image_quad_scale_y: 1.0,
            fit_scale: 1.0,
        }
    }

    /// Returns true when the current interaction viewport can be used for placement.
    pub(super) fn has_valid_viewport(&self) -> bool {
        self.viewport.is_valid()
    }

    /// Updates the logical interaction viewport from frontend layout coordinates.
    pub(super) fn update_viewport(&mut self, x: f32, y: f32, width: f32, height: f32) {
        self.viewport.x = x.max(0.0).round() as u32;
        self.viewport.y = y.max(0.0).round() as u32;
        self.viewport.width = width.max(0.0).round() as u32;
        self.viewport.height = height.max(0.0).round() as u32;
    }

    /// Stores the latest user pan/zoom transform values.
    pub(super) fn update_user_transform(&mut self, scale: f32, offset_x: f32, offset_y: f32) {
        self.user_scale = scale;
        self.user_offset_x = offset_x;
        self.user_offset_y = offset_y;
    }

    /// Stores whether transparent images should draw over the checkerboard background.
    pub(super) fn set_checkerboard_enabled(&mut self, enabled: bool) -> bool {
        let value = if enabled { 1.0 } else { 0.0 };

        if (self.checkerboard_enabled - value).abs() < f32::EPSILON {
            return false;
        }

        self.checkerboard_enabled = value;

        true
    }

    /// Stores the current image-quad scale generated from image and surface aspect ratios.
    pub(super) fn update_image_quad_scale(&mut self, scale_x: f32, scale_y: f32) {
        self.image_quad_scale_x = scale_x;
        self.image_quad_scale_y = scale_y;
    }

    /// Recomputes how much the image quad should scale to fit the interaction viewport.
    pub(super) fn update_fit_scale(&mut self, surface_width: u32, surface_height: u32) {
        if surface_width == 0
            || surface_height == 0
            || self.viewport.width == 0
            || self.viewport.height == 0
        {
            self.fit_scale = 1.0;
            return;
        }

        let surface_width = surface_width as f32;
        let surface_height = surface_height as f32;

        let scale_from_width = (self.viewport.width as f32 / surface_width)
            / self.image_quad_scale_x.max(f32::EPSILON);

        let scale_from_height = (self.viewport.height as f32 / surface_height)
            / self.image_quad_scale_y.max(f32::EPSILON);

        self.fit_scale = scale_from_width.min(scale_from_height);
    }

    /// Resolves the display-shader transform for the current viewer and surface state.
    pub(super) fn transform_for_surface(
        &self,
        surface_width: u32,
        surface_height: u32,
    ) -> Option<ViewerTransform> {
        if surface_width == 0 || surface_height == 0 || !self.viewport.is_valid() {
            return None;
        }

        let surface_width = surface_width as f32;
        let surface_height = surface_height as f32;

        let viewport_center_x = self.viewport.x as f32 + self.viewport.width as f32 / 2.0;
        let viewport_center_y = self.viewport.y as f32 + self.viewport.height as f32 / 2.0;

        let viewport_fraction_x = self.viewport.width as f32 / surface_width;
        let viewport_fraction_y = self.viewport.height as f32 / surface_height;

        let ndc_center_x = (viewport_center_x / surface_width) * 2.0 - 1.0;
        let ndc_center_y = 1.0 - (viewport_center_y / surface_height) * 2.0;

        Some(ViewerTransform {
            scale: self.user_scale * self.fit_scale,
            offset_x: ndc_center_x + self.user_offset_x * viewport_fraction_x,
            offset_y: ndc_center_y + self.user_offset_y * viewport_fraction_y,
            checkerboard_enabled: self.checkerboard_enabled,
        })
    }
}
