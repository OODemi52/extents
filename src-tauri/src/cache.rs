use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tauri::path;

pub enum CacheType {
    Preview,
    Thumbnail,
    Metadata,
}

impl CacheType {
    fn sub_directory(&self) -> &'static str {
        match self {
            CacheType::Preview => "preview",
            CacheType::Thumbnail => "thumbnails",
            CacheType::Metadata => "metadata",
        }
    }
}

pub struct CacheManager {
    base_cache_path: PathBuf,
}

impl CacheManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        let base_cache_path = app_handle
            .path_resolver()
            .app_cache_dir()
            .expect("App cache directory not found");

        Self { base_cache_path }
    }

    pub fn get_cache_path(
        &self,
        original_path_str: &str,
        cache_type: CacheType,
    ) -> Result<PathBuf, String> {
        let original_path = Path::new(original_path_str);

        let metadata = fs::metadata(original_path)
            .map_err(|e| format!("Failed to get metadata for {}: {}", original_path_str, e))?;

        let modification_time = metadata.modified().map_err(|e| {
            format!(
                "File system doesn't support modification time for {}: {}",
                original_path_str, e
            )
        })?;

        let modification_time_to_seconds = modification_time
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|e| format!("System time is before UNIX EPOCH: {}", e))?
            .as_secs();

        let cache_dir = self.base_cache_path.join(cache_type.sub_directory());

        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir).ok();
        }

        let mut hasher = blake3::Hasher::new();

        hasher.update(original_path_str.as_bytes());

        hasher.update(&modification_time_to_seconds.to_le_bytes());

        let hash = hasher.finalize();

        let cache_filename = format!("{}.jpg", hash.to_hex());

        Ok(cache_dir.join(cache_filename))
    }
}
