use crate::core::sidecar::{
    load_sidecar as load_sidecar_document, save_sidecar as save_sidecar_document, Sidecar,
};

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
