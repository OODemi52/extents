use crate::commands::db::DbConnection;
use crate::renderer::Renderer;
use std::sync::{Arc, Mutex};
use tauri::{WebviewWindow, Wry};

pub struct AppState {
    pub db: DbConnection,
    pub renderer: Arc<Mutex<Option<Renderer<'static>>>>,
    pub window: WebviewWindow<Wry>,
}

impl AppState {
    pub fn new(db: DbConnection, window: WebviewWindow<Wry>) -> Self {
        Self {
            db,
            renderer: Arc::new(Mutex::new(None)),
            window,
        }
    }
}
