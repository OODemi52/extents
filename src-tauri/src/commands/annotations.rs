use crate::core::db::annotations::{
    get_annotation_values, set_flag_value, set_rating_values, ImageMetadataRow, RatingEntry,
};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn set_ratings(entries: Vec<RatingEntry>, state: State<AppState>) -> Result<(), String> {
    let mut connection = state.db.connection.lock().map_err(|e| e.to_string())?;

    set_rating_values(&mut *connection, &entries).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_flag(path: String, flag: String, state: State<AppState>) -> Result<(), String> {
    let connection = state.db.connection.lock().map_err(|e| e.to_string())?;

    set_flag_value(&connection, &path, &flag).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_annotations(
    paths: Vec<String>,
    state: State<AppState>,
) -> Result<Vec<ImageMetadataRow>, String> {
    let connection = state.db.connection.lock().map_err(|e| e.to_string())?;

    get_annotation_values(&connection, &paths).map_err(|e| e.to_string())
}
