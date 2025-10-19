use crate::commands::db::DbConnection;
use crate::renderer::Renderer;
use std::sync::Mutex;
use tauri::WebviewWindow;

pub struct AppState {
    pub db: DbConnection,
    pub renderer: Mutex<Option<Renderer<'static>>>,
    pub window: WebviewWindow,
}

impl AppState {
    pub fn new(db: DbConnection, window: WebviewWindow) -> Self {
        Self {
            db,
            renderer: Mutex::new(None),
            window: window.clone(),
        }
    }
}
