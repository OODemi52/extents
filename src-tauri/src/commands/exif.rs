use crate::app::AppState;
use crate::core::db::exif::{refresh_exif_entries, ImageExifEntry};
use tauri::State;

#[tauri::command]
pub fn get_exif_metadata(
    paths: Vec<String>,
    state: State<AppState>,
) -> Result<Vec<ImageExifEntry>, String> {
    let db = &state.db;

    refresh_exif_entries(db, &paths).map_err(|error| error.to_string())
}
