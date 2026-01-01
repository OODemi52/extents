use anyhow::anyhow;
use base64::{engine::general_purpose, Engine as _};
use image::{self, imageops, GenericImageView};
use std::path::PathBuf;
use tauri::Emitter;

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
            let mut batch: Vec<ImageMetadata> = Vec::with_capacity(SCAN_BATCH_SIZE);
            let entries = std::fs::read_dir(&scan_path)
                .map_err(|e| anyhow!("Failed to read directory {}: {}", scan_path.display(), e))?;
            let mut processed = 0usize;

            for entry in entries {
                let entry = match entry {
                    Ok(e) => e,
                    Err(_) => continue,
                };

                let path = entry.path();
                if !is_valid_file(&path) {
                    continue;
                }

                let file_name = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();

                let file_size = entry.metadata().map(|m| m.len()).unwrap_or(0);

                batch.push(ImageMetadata {
                    path: path.to_string_lossy().to_string(),
                    thumbnail_path: None,
                    width: None,
                    height: None,
                    file_size,
                    file_name,
                });
                processed += 1;

                if batch.len() >= SCAN_BATCH_SIZE {
                    let payload = std::mem::take(&mut batch);
                    emit_handle
                        .emit("folder-scan-batch", payload)
                        .map_err(|e| anyhow!(e.to_string()))?;
                    batch = Vec::with_capacity(SCAN_BATCH_SIZE);
                }
            }

            if !batch.is_empty() {
                let payload = std::mem::take(&mut batch);
                emit_handle
                    .emit("folder-scan-batch", payload)
                    .map_err(|e| anyhow!(e.to_string()))?;
            }

            log::info!(
                "Folder scan complete for {} ({} images)",
                folder_path,
                processed
            );

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

#[tauri::command]
pub fn get_proxy_file_path(image_path: String, max_size: u32) -> Result<String, String> {
    let original_path = PathBuf::from(&image_path);

    if !original_path.exists() {
        return Err("Original file does not exist".into());
    }

    let cache_dir = dirs::cache_dir()
        .unwrap_or_else(|| std::env::temp_dir())
        .join("com.extents.cache");

    std::fs::create_dir_all(&cache_dir).ok();

    let proxy_file_name = format!(
        "{}_{}_full_size_proxy.jpg",
        original_path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy(),
        max_size
    );

    let proxy_file_path = cache_dir.join(proxy_file_name);

    if proxy_file_path.exists() {
        return Ok(proxy_file_path.to_string_lossy().to_string());
    }

    match image::open(&original_path) {
        Ok(img) => {
            let (new_width, new_height) = {
                let (w, h) = img.dimensions();
                if w > h {
                    let ratio = h as f32 / w as f32;
                    (max_size, (max_size as f32 * ratio).round() as u32)
                } else {
                    let ratio = w as f32 / h as f32;
                    ((max_size as f32 * ratio).round() as u32, max_size)
                }
            };

            let proxy = img.resize_exact(new_width, new_height, imageops::FilterType::Triangle);

            let mut file = std::fs::File::create(&proxy_file_path)
                .map_err(|e| format!("Failed to create proxy file: {}", e))?;

            proxy
                .write_to(&mut file, image::ImageFormat::Jpeg)
                .map_err(|e| format!("Failed to write proxy file: {}", e))?;

            Ok(proxy_file_path.to_string_lossy().to_string())
        }

        Err(e) => Err(format!("Failed to open image: {}", e)),
    }
}
