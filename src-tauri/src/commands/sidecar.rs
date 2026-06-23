use crate::core::sidecar::{
    load_sidecar as load_sidecar_document, save_sidecar as save_sidecar_document, Sidecar,
};
use crate::renderer::RendererManager;
use crate::state::AppState;
use log::warn;
use tauri::State;

#[tauri::command]
pub fn load_sidecar(path: String) -> Result<Sidecar, String> {
    match load_sidecar_document(&path) {
        Ok(sidecar) => Ok(sidecar),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub fn save_sidecar(path: String, sidecar: Sidecar) -> Result<(), String> {
    match save_sidecar_document(&path, &sidecar) {
        Ok(()) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub fn sync_sidecar(sidecar: Sidecar, state: State<AppState>) {
    match RendererManager::lock(&state.renderer_manager) {
        Ok(mut manager) => manager.sync_sidecar(sidecar.recipe()),
        Err(error) => warn!("{error}"),
    }
}
