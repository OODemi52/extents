use rayon::ThreadPool;
use rayon::ThreadPoolBuilder;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::SystemTime;
use tauri::Manager;
use tokio::sync::watch;

#[derive(Clone, Copy)]
pub enum CacheType {
    Thumbnail,
    Preview,
}

impl CacheType {
    pub fn sub_directory(&self) -> &'static str {
        match self {
            CacheType::Thumbnail => "thumbnails",
            CacheType::Preview => "previews",
        }
    }
}

pub struct CacheManager {
    pub base_cache_path: PathBuf,
    thumbnail_pool: Arc<ThreadPool>,
    preview_pool: Arc<ThreadPool>,
    metadata_pool: Arc<ThreadPool>,
    inflight_thumbnail_generation_map: Arc<Mutex<HashMap<PathBuf, watch::Sender<bool>>>>,
}

impl CacheManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        let base_cache_path = app_handle
            .path()
            .app_cache_dir()
            .expect("App cache directory not found");

        let generated_image_pool_size = std::thread::available_parallelism()
            .map(|nonzero_value| (nonzero_value.get() * 3 / 4).max(2).min(8))
            .unwrap_or(4);

        let metadata_pool_size = (generated_image_pool_size / 2).max(1).min(2);

        let thumbnail_pool = ThreadPoolBuilder::new()
            .thread_name(|index| format!("thumbnail-{}", index))
            .num_threads(generated_image_pool_size)
            .build()
            .unwrap_or_else(|_| {
                ThreadPoolBuilder::new()
                    .build()
                    .expect("Failed to build thread pool")
            });

        let preview_pool = ThreadPoolBuilder::new()
            .thread_name(|index| format!("preview-{}", index))
            .num_threads(generated_image_pool_size)
            .build()
            .unwrap_or_else(|_| {
                ThreadPoolBuilder::new()
                    .build()
                    .expect("Failed to build thread pool")
            });

        let metadata_pool = ThreadPoolBuilder::new()
            .thread_name(|index| format!("metadata-{}", index))
            .num_threads(metadata_pool_size)
            .build()
            .unwrap_or_else(|_| {
                ThreadPoolBuilder::new()
                    .build()
                    .expect("Failed to build thread pool")
            });

        Self {
            base_cache_path,
            thumbnail_pool: Arc::new(thumbnail_pool),
            preview_pool: Arc::new(preview_pool),
            metadata_pool: Arc::new(metadata_pool),
            inflight_thumbnail_generation_map: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn get_cache_path(
        &self,
        original_path: &str,
        cache_type: CacheType,
    ) -> Result<PathBuf, String> {
        let path = Path::new(original_path);

        let metadata = fs::metadata(path)
            .map_err(|error| format!("Failed to get metadata for {}: {}", original_path, error))?;

        let modification_time = metadata.modified().map_err(|error| {
            format!(
                "File system doesn't support modification time for {}: {}",
                original_path, error
            )
        })?;

        let modification_time_secs = modification_time
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|error| format!("System time is before UNIX EPOCH: {}", error))?
            .as_secs();

        let cache_dir = self.base_cache_path.join(cache_type.sub_directory());

        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir).ok();
        }

        let mut hasher = blake3::Hasher::new();

        hasher.update(original_path.as_bytes());

        hasher.update(&modification_time_secs.to_le_bytes());

        let hash = hasher.finalize();

        let cache_filename = format!("{}.jpg", hash.to_hex());

        Ok(cache_dir.join(cache_filename))
    }

    pub fn thumbnail_pool(&self) -> Arc<ThreadPool> {
        Arc::clone(&self.thumbnail_pool)
    }

    pub fn preview_pool(&self) -> Arc<ThreadPool> {
        Arc::clone(&self.preview_pool)
    }

    pub fn metadata_pool(&self) -> Arc<ThreadPool> {
        Arc::clone(&self.metadata_pool)
    }

    pub fn inflight_thumbnail_generation_map(
        &self,
    ) -> Arc<Mutex<HashMap<PathBuf, watch::Sender<bool>>>> {
        Arc::clone(&self.inflight_thumbnail_generation_map)
    }
}
