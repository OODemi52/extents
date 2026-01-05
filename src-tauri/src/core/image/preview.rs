use image::image_dimensions;
use log::{error, info};
use std::path::PathBuf;
use tokio::sync::oneshot;

use crate::core::cache::generator::generate_preview;
use crate::core::cache::manager::{CacheManager, CacheType};

pub struct PreviewInfo {
    pub path: PathBuf,
    pub width: u32,
    pub height: u32,
}

pub async fn get_or_create_preview(
    cache_manager: &CacheManager,
    original_path: &str,
) -> Result<PreviewInfo, String> {
    let cache_path = cache_manager.get_cache_path(original_path, CacheType::Preview)?;

    if cache_path.exists() {
        info!("[preview] cache hit {}", original_path);
        let (width, height) = image_dimensions(&cache_path)
            .map_err(|error| format!("Preview dimensions error: {error}"))?;

        return Ok(PreviewInfo {
            path: cache_path,
            width,
            height,
        });
    }

    info!("[preview] generate {}", original_path);
    let pool = cache_manager.preview_pool();

    let owned_path = original_path.to_owned();

    let cache_path_clone = cache_path.clone();

    let (transmitter, receiver) = oneshot::channel();

    pool.spawn(move || {
        let result: Result<(PathBuf, u32, u32), anyhow::Error> = (|| {
            generate_preview(&owned_path, &cache_path_clone)?;

            let (width, height) = image_dimensions(&cache_path_clone)?;

            Ok((cache_path_clone, width, height))
        })();

        if transmitter.send(result).is_err() {
            error!(
                "Unable to send preview generation result for {}",
                owned_path
            );
        }
    });

    match receiver
        .await
        .map_err(|error| format!("Preview generation cancelled: {error}"))?
    {
        Ok((path, width, height)) => Ok(PreviewInfo {
            path,
            width,
            height,
        }),
        Err(error) => Err(error.to_string()),
    }
}
