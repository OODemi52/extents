use crate::core::db::annotations::{
    get_annotation_values, set_flag_values, set_rating_values, FlagEntry, ImageAnnotationEntry,
    RatingEntry,
};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn set_ratings(entries: Vec<RatingEntry>, state: State<AppState>) -> Result<(), String> {
    let mut connection = state.db.connection.lock().map_err(|e| e.to_string())?;

    set_rating_values(&mut *connection, &entries).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_flags(entries: Vec<FlagEntry>, state: State<AppState>) -> Result<(), String> {
    let mut connection = state.db.connection.lock().map_err(|e| e.to_string())?;

    set_flag_values(&mut *connection, &entries).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_annotations(
    paths: Vec<String>,
    state: State<AppState>,
) -> Result<Vec<ImageAnnotationEntry>, String> {
    let connection = state.db.connection.lock().map_err(|e| e.to_string())?;

    get_annotation_values(&connection, &paths).map_err(|e| e.to_string())
}
