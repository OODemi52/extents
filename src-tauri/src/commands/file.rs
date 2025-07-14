use base64::{engine::general_purpose, Engine as _};
use image::{self, imageops};
use std::path::PathBuf;

#[derive(serde::Serialize)]
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
        match ext.to_string_lossy().to_ascii_lowercase().as_str() {
            "jpg" | "jpeg" | "png" | "gif" | "bmp" | "tiff" | "webp" => true,
            _ => false,
        }
    } else {
        false
    }
}

#[tauri::command]
pub async fn get_file_metadata(folder_path: String) -> Vec<ImageMetadata> {
    let paths = std::fs::read_dir(folder_path).unwrap(); // Unwrap might panic, discouraged from using it. Either use pattern matching or unrwap_or/unwrap_or_else

    let mut files = vec![];

    for entry in paths.flatten() {
        let path = entry.path();

        let thumbnail_path = get_thumbnail_path(path.to_string_lossy().to_string(), 100)
            .await
            .ok();

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
                thumbnail_path,
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
pub async fn get_thumbnail_path(image_path: String, max_size: u32) -> Result<String, String> {
    // use spawn_blocking for CPU-heavy sync code
    tauri::async_runtime::spawn_blocking(move || {
        let original_path = PathBuf::from(&image_path);

        if !original_path.exists() {
            return Err("Original file does not exist".into());
        }

        let cache_dir = dirs::cache_dir()
            .unwrap_or_else(|| std::env::temp_dir())
            .join("com.extents.cache");

        std::fs::create_dir_all(&cache_dir).ok();

        let thumb_file_name = format!(
            "{}_{}.jpg",
            original_path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy(),
            max_size
        );

        let thumb_path = cache_dir.join(thumb_file_name);

        if thumb_path.exists() {
            return Ok(thumb_path.to_string_lossy().to_string());
        }

        match image::open(&original_path) {
            Ok(img) => {
                let thumb = img.resize(max_size, max_size, imageops::FilterType::Triangle);

                let mut file = std::fs::File::create(&thumb_path)
                    .map_err(|e| format!("Failed to create thumbnail: {}", e))?;

                thumb
                    .write_to(&mut file, image::ImageFormat::Jpeg)
                    .map_err(|e| format!("Failed to write thumbnail: {}", e))?;

                Ok(thumb_path.to_string_lossy().to_string())
            }

            Err(e) => Err(format!("Failed to open image: {}", e)),
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
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
pub fn get_thumbnail(image_path: String, max_size: u32) -> Result<String, String> {
    let original_path = PathBuf::from(&image_path);

    if !original_path.exists() {
        return Err("Original file does not exist".into());
    }

    let cache_dir = dirs::cache_dir()
        .unwrap_or_else(|| std::env::temp_dir())
        .join("com.extents.cache");

    std::fs::create_dir_all(&cache_dir).ok();

    let thumb_file_name = format!(
        "{}_{}.jpg",
        original_path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy(),
        max_size
    );

    let thumb_path = cache_dir.join(thumb_file_name);

    if thumb_path.exists() {
        println!("Found existing thumbnail at: {}", thumb_path.display());
        return Ok(thumb_path.to_string_lossy().to_string());
    }

    println!("Creating new thumbnail at: {}", thumb_path.display());

    let thumbnail_data = if thumb_path.exists() {
        std::fs::read(&thumb_path).map_err(|e| format!("Failed to read thumbnail: {}", e))?
    } else {
        match image::open(&original_path) {
            Ok(img) => {
                let thumb = img.resize(max_size, max_size, imageops::FilterType::Triangle);

                let mut buffer = Vec::new();

                let mut cursor = std::io::Cursor::new(&mut buffer);

                thumb
                    .write_to(&mut cursor, image::ImageFormat::Jpeg)
                    .map_err(|e| format!("Failed to encode thumbnail: {}", e))?;

                println!("Created new thumbnail at: {}", thumb_path.display());
                println!("Original: {}, size: {}", original_path.display(), max_size);

                std::fs::write(&thumb_path, &buffer)
                    .map_err(|e| format!("Failed to cache thumbnail: {}", e))?;

                buffer
            }

            Err(e) => return Err(format!("Failed to open image: {}", e)),
        }
    };

    let base64 = general_purpose::STANDARD.encode(&thumbnail_data);

    Ok(base64)
}
