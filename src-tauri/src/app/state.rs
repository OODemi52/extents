use std::sync::{Arc, Mutex};

use tauri::{WebviewWindow, Wry};

use crate::core::db::connection::DbConnection;
use crate::renderer::{RendererManager, RendererManagerHandle};

pub struct AppState {
    pub db: DbConnection,
    pub renderer_manager: RendererManagerHandle,
    pub window: WebviewWindow<Wry>,
}

impl AppState {
    pub fn new(db: DbConnection, window: WebviewWindow<Wry>) -> Self {
        Self {
            db,
            renderer_manager: Arc::new(Mutex::new(RendererManager::new())),
            window,
        }
    }
}
