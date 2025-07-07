use base64::{engine::general_purpose, Engine as _};
use image::{self, imageops};
use std::path::PathBuf;

#[derive(serde::Serialize)]
pub struct ImageMetadata {
    path: String,
    thumbnail: Option<String>,
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
pub fn get_file_metadata(folder_path: String) -> Vec<ImageMetadata> {
    let paths = std::fs::read_dir(folder_path).unwrap();

    let mut images = vec![];

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
                Err(_) => continue, // Later impl render of broken file
            };

            images.push(ImageMetadata {
                path: path.to_string_lossy().to_string(),
                thumbnail: None,
                width: None,
                height: None,
                file_size: metadata.len(),
                file_name,
            });
        }
    }

    images
}

#[tauri::command]
pub fn get_file_thumbnail(image_path: String, max_size: u32) -> Result<String, String> {
    let path = PathBuf::from(image_path);

    if !path.exists() {
        return Err("File does not exist".into());
    }

    match image::open(&path) {
        Ok(img) => {
            let thumbnail = img.resize(max_size, max_size, imageops::FilterType::Triangle);

            let mut buffer = Vec::new();

            let mut cursor = std::io::Cursor::new(&mut buffer);

            if let Err(e) = thumbnail.write_to(&mut cursor, image::ImageFormat::Jpeg) {
                return Err(format!("Failed to compress image: {}", e));
            }

            let base64 = general_purpose::STANDARD.encode(&buffer);

            Ok(base64)
        }
        Err(e) => Err(format!("Failed to open image: {}", e)),
    }
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
