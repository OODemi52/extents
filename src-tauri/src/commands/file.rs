use anyhow::anyhow;
use base64::{engine::general_purpose, Engine as _};
use std::path::PathBuf;
use tauri::Emitter;
use tauri::Manager;
use unicase::UniCase;

use crate::core::cache::manager::CacheManager;
use crate::core::db::exif::refresh_exif_entries;
use crate::state::AppState;

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImageMetadata {
    path: String,
    thumbnail_path: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    file_size: u64,
    file_name: String,
}

fn is_valid_file(path: &PathBuf) -> bool {
    let file_name = path.file_name().and_then(|name| name.to_str());

    if file_name.is_some_and(|name| name.starts_with('.')) {
        return false;
    }

    if let Some(ext) = path.extension() {
        // At the moment, the supported file types are completely based on what types of files
        // the dnglabs/rawler supports for decoding. Later, I will most likely add custom support
        // for files that are not included here
        //
        // ***Note: Rawler supports .raw files, but to avoid false positives, they are not included
        // as a valid file type. Will add once I am able to implement better checks to avoid
        // false file type positives.
        match ext.to_string_lossy().to_ascii_lowercase().as_str() {
            "jpg" | "jpeg" | "png" | "gif" | "bmp" | "tif" | "tiff" | "webp" | "3fr" | "ari"
            | "arw" | "cr2" | "cr3" | "crm" | "crw" | "dcr" | "dcs" | "dng" | "erf" | "fff"
            | "iiq" | "kdc" | "mef" | "mos" | "mrw" | "nef" | "nrw" | "orf" | "ori" | "pef"
            | "qtk" | "raf" | "rw2" | "rwl" | "srw" | "x3f" => true,
            _ => false,
        }
    } else {
        false
    }
}

const SCAN_BATCH_SIZE: usize = 64;

#[tauri::command]
pub fn start_folder_scan(folder_path: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    log::info!("Starting folder scan for {}", folder_path);
    let scan_path = PathBuf::from(&folder_path);

    if !scan_path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }

    let emit_handle = app_handle.clone();
    let complete_handle = app_handle.clone();
    let error_handle = app_handle.clone();

    tauri::async_runtime::spawn(async move {
        let result = tauri::async_runtime::spawn_blocking(move || -> Result<(), anyhow::Error> {
            let mut valid_files: Vec<ImageMetadata> = Vec::new();
            let mut exif_paths: Vec<String> = Vec::new();

            let all_files: Vec<_> = std::fs::read_dir(&scan_path)
                .map_err(|error| {
                    anyhow!(
                        "Failed to read directory {}: {}",
                        scan_path.display(),
                        error
                    )
                })?
                .collect::<Result<Vec<_>, _>>()
                .unwrap_or_default();

            for file in &all_files {
                let path = file.path();

                if !is_valid_file(&path) {
                    continue;
                }

                let file_name = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();

                let file_size = file.metadata().map(|m| m.len()).unwrap_or(0);

                valid_files.push(ImageMetadata {
                    path: path.to_string_lossy().to_string(),
                    thumbnail_path: None,
                    width: None,
                    height: None,
                    file_size,
                    file_name,
                });

                exif_paths.push(path.to_string_lossy().to_string());
            }

            let total_file_count = valid_files.len();

            emit_handle
                .emit("folder-total", total_file_count)
                .map_err(|e| anyhow::anyhow!(e.to_string()))?;

            valid_files.sort_by(|a, b| UniCase::new(&a.file_name).cmp(&UniCase::new(&b.file_name)));

            for batch in valid_files.chunks(SCAN_BATCH_SIZE) {
                emit_handle
                    .emit("folder-scan-batch", batch.to_vec())
                    .map_err(|e| anyhow!(e.to_string()))?;
            }

            log::info!(
                "Folder scan complete for {} ({} images)",
                folder_path,
                total_file_count
            );

            if !exif_paths.is_empty() {
                let app_state = app_handle.state::<AppState>();
                let cache_manager = app_handle.state::<CacheManager>();
                let db = app_state.db.clone();

                let metadata_pool = cache_manager.metadata_pool();

                metadata_pool.spawn(move || {
                    if let Err(error) = refresh_exif_entries(&db, &exif_paths) {
                        log::warn!("[exif] prefetch failed: {}", error);
                    }
                });
            }

            Ok(())
        })
        .await;

        match result {
            Ok(Ok(())) => {
                complete_handle.emit("folder-scan-complete", ()).ok();
            }
            Ok(Err(err)) => {
                error_handle.emit("folder-scan-error", err.to_string()).ok();
            }
            Err(err) => {
                error_handle.emit("folder-scan-error", err.to_string()).ok();
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn get_file_metadata(folder_path: String) -> Vec<ImageMetadata> {
    let paths = std::fs::read_dir(folder_path).unwrap(); // Unwrap might panic, discouraged from using it. Either use pattern matching or unrwap_or/unwrap_or_else

    let mut files = vec![];

    for entry in paths.flatten() {
        let path = entry.path();

        if is_valid_file(&path) {
            let file_name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            let metadata = match std::fs::metadata(&path) {
                Ok(md) => md,
                Err(_) => continue,
            };

            files.push(ImageMetadata {
                path: path.to_string_lossy().to_string(),
                thumbnail_path: None,
                width: None,
                height: None,
                file_size: metadata.len(),
                file_name,
            });
        }
    }

    files
}

#[tauri::command]
pub fn get_file(image_path: String) -> Result<String, String> {
    let path = PathBuf::from(image_path);

    if !path.exists() {
        return Err("File does not exist".into());
    }

    match std::fs::read(&path) {
        Ok(data) => {
            let base64 = general_purpose::STANDARD.encode(&data);

            Ok(base64)
        }

        Err(e) => Err(format!("Failed to read image: {}", e)),
    }
}
