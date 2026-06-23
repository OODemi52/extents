use std::time::{Duration, Instant};

/// Renderer pacing mode used by the frontend-driven render loop.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RenderState {
    Idle,
    Active,
    Paused,
}

/// Tracks render pacing state and the last completed frame time.
///
/// The frontend still owns the browser `requestAnimationFrame` loop, while this
/// schedule tells that loop whether enough time has elapsed for Rust to render.
pub(super) struct RenderSchedule {
    state: RenderState,
    last_render: Instant,
}

impl RenderSchedule {
    /// Creates a render schedule in idle mode.
    pub(super) fn new() -> Self {
        Self {
            state: RenderState::Idle,
            last_render: Instant::now(),
        }
    }

    /// Updates the current render pacing mode.
    pub(super) fn set_state(&mut self, state: RenderState) {
        self.state = state;
    }

    /// Returns true when rendering should be skipped entirely.
    pub(super) fn is_paused(&self) -> bool {
        matches!(self.state, RenderState::Paused)
    }

    /// Returns true when the current mode allows another frame to render.
    pub(super) fn should_render(&self) -> bool {
        match self.state {
            RenderState::Paused => false,
            RenderState::Idle => self.last_render.elapsed() > Duration::from_millis(100),
            RenderState::Active => self.last_render.elapsed() > Duration::from_millis(16),
        }
    }

    /// Marks the current frame as rendered.
    pub(super) fn mark_rendered(&mut self) {
        self.last_render = Instant::now();
    }
}
