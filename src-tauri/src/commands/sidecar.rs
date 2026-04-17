use crate::core::sidecar::{
    load_sidecar as load_sidecar_document, save_sidecar as save_sidecar_document, Sidecar,
};
use crate::renderer::DisplayParamsUniforms;
use crate::state::AppState;
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
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        let display_params = DisplayParamsUniforms::from_recipe_and_intent(
            sidecar.recipe(),
            renderer.current_display_render_intent(),
        );

        renderer.update_display_params(display_params);
        renderer.render();
    }
}
