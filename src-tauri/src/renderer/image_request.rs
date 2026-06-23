use tauri::async_runtime::JoinHandle;

/// Tracks asynchronous image-load request ownership for the renderer.
///
/// This decides which decode/upload request is currently allowed to update the
/// displayed image and aborts stale background work when a newer request supersedes it.
pub(super) struct ImageRequest {
    pending_load: Option<JoinHandle<()>>,
    request_counter: u64,
    active_request_id: Option<u64>,
}

impl ImageRequest {
    /// Creates an empty image request tracker with no active request.
    pub(super) fn new() -> Self {
        Self {
            pending_load: None,
            request_counter: 0,
            active_request_id: None,
        }
    }

    /// Starts a new image request, aborting any in-flight background load.
    pub(super) fn begin_request(&mut self) -> u64 {
        if let Some(handle) = self.pending_load.take() {
            handle.abort();
        }

        self.request_counter = self.request_counter.wrapping_add(1);
        let request_id = self.request_counter;
        self.active_request_id = Some(request_id);

        request_id
    }

    /// Attaches a background load handle if the request is still current.
    pub(super) fn attach_load_handle(&mut self, request_id: u64, handle: JoinHandle<()>) {
        if self.active_request_id == Some(request_id) {
            if let Some(existing) = self.pending_load.take() {
                existing.abort();
            }
            self.pending_load = Some(handle);
        } else {
            handle.abort();
        }
    }

    /// Marks a request complete if it is still the active request.
    pub(super) fn complete_request(&mut self, request_id: u64) {
        if self.active_request_id == Some(request_id) {
            self.pending_load = None;
            self.active_request_id = None;
        }
    }

    /// Returns true when the provided request is still allowed to update the image.
    pub(super) fn is_request_active(&self, request_id: u64) -> bool {
        self.active_request_id == Some(request_id)
    }

    /// Clears active request state and aborts any in-flight background load.
    pub(super) fn clear(&mut self) {
        if let Some(handle) = self.pending_load.take() {
            handle.abort();
        }

        self.active_request_id = None;
    }
}
