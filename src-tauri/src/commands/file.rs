use std::path::PathBuf;

#[derive(serde::Serialize)]
pub struct ImageData {
    path: String,
    base64: String,
}

fn is_image_file(path: &PathBuf) -> bool {
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
pub fn list_images_in_folder(folder_path: String) -> Vec<ImageData> {
    let paths = std::fs::read_dir(folder_path).unwrap();
    let mut images = vec![];

    for entry in paths.flatten() {
        let path = entry.path();
        if is_image_file(&path) {
            let data = std::fs::read(&path).unwrap_or_default();
            let encoded = base64::encode(&data);
            images.push(ImageData {
                path: path.to_string_lossy().to_string(),
                base64: encoded,
            });
        }
    }

    images
}
