use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub fn update_exposure(exposure_ev: f32, state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.update_exposure(exposure_ev);
        renderer.render();
    }
}
