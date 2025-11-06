use std::path::PathBuf;

use log::{error, info};
use serde::Serialize;
use tauri::Manager;

use crate::core::cache::manager::{CacheManager, CacheType};
use crate::core::image::{get_or_create_preview, get_or_create_thumbnail, PreviewInfo};

#[tauri::command]
pub async fn get_thumbnail(path: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    let cache_manager = app_handle.state::<CacheManager>();
    let info = get_or_create_thumbnail(&cache_manager, &path).await?;

    Ok(info.path.to_string_lossy().into_owned())
}

#[derive(Serialize)]
pub struct PreviewResponse {
    pub path: String,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub async fn prepare_preview(
    path: String,
    app_handle: tauri::AppHandle,
) -> Result<PreviewResponse, String> {
    let cache_manager = app_handle.state::<CacheManager>();
    let PreviewInfo {
        path: cached,
        width,
        height,
    } = get_or_create_preview(&cache_manager, &path).await?;

    Ok(PreviewResponse {
        path: cached.to_string_lossy().into_owned(),
        width,
        height,
    })
}

#[tauri::command]
pub fn prefetch_thumbnails(paths: Vec<String>, app_handle: tauri::AppHandle) -> Result<(), String> {
    info!("Prefetching {} thumbnails", paths.len());

    let cache_manager = app_handle.state::<CacheManager>();
    let base_cache_path = cache_manager.base_cache_path.clone();
    let cache_subdirectory = base_cache_path.join(CacheType::Thumbnail.sub_directory());

    std::thread::spawn(move || {
        use rayon::prelude::*;

        paths.par_iter().for_each(
            |path| match get_cache_path_direct(path, &cache_subdirectory) {
                Ok(cache_path) => {
                    if !cache_path.exists() {
                        if let Err(error) =
                            crate::core::cache::generator::generate_thumbnail(path, &cache_path)
                        {
                            error!("Prefetch failed for {}: {}", path, error);
                        }
                    }
                }
                Err(error) => {
                    error!("Failed to get cache path for {}: {}", path, error);
                }
            },
        );

        info!("Prefetch complete");
    });

    Ok(())
}

fn get_cache_path_direct(
    original_path: &str,
    cache_dir: &std::path::Path,
) -> Result<PathBuf, String> {
    use std::time::SystemTime;

    let path = std::path::Path::new(original_path);

    let metadata =
        std::fs::metadata(path).map_err(|error| format!("Failed to get metadata: {}", error))?;

    let modification_time = metadata
        .modified()
        .map_err(|error| format!("File system doesn't support modification time: {}", error))?;

    let modification_time_secs = modification_time
        .duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|error| format!("System time error: {}", error))?
        .as_secs();

    let mut hasher = blake3::Hasher::new();

    hasher.update(original_path.as_bytes());
    hasher.update(&modification_time_secs.to_le_bytes());

    let hash = hasher.finalize();

    let cache_filename = format!("{}.jpg", hash.to_hex());

    Ok(cache_dir.join(cache_filename))
}
