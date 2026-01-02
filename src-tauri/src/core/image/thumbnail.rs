use image::image_dimensions;
use log::error;
use std::path::PathBuf;
use tokio::sync::{oneshot, watch};

use crate::core::cache::generator::generate_thumbnail;
use crate::core::cache::manager::{CacheManager, CacheType};

pub struct ThumbnailInfo {
    pub path: PathBuf,
    pub width: u32,
    pub height: u32,
}

pub async fn get_or_create_thumbnail(
    cache_manager: &CacheManager,
    original_path: &str,
) -> Result<ThumbnailInfo, String> {
    let cache_path = cache_manager.get_cache_path(original_path, CacheType::Thumbnail)?;

    if cache_path.exists() {
        let (width, height) = image_dimensions(&cache_path)
            .map_err(|error| format!("Thumbnail dimensions error: {error}"))?;

        return Ok(ThumbnailInfo {
            path: cache_path,
            width,
            height,
        });
    }

    let inflight = cache_manager.inflight_thumbnail_generation_map();

    let (inflight_sender, mut inflight_receiver, should_generate) = {
        let mut map = inflight
            .lock()
            .map_err(|_| "Thumbnail inflight lock error")?;

        if let Some(existing) = map.get(&cache_path) {
            (existing.clone(), existing.subscribe(), false)
        } else {
            let (sender, receiver) = watch::channel(false);
            map.insert(cache_path.clone(), sender.clone());
            (sender, receiver, true)
        }
    };

    if !should_generate {
        if !*inflight_receiver.borrow() {
            let _ = inflight_receiver.changed().await;
        }

        if cache_path.exists() {
            let (width, height) = image_dimensions(&cache_path)
                .map_err(|error| format!("Thumbnail dimensions error: {error}"))?;

            return Ok(ThumbnailInfo {
                path: cache_path,
                width,
                height,
            });
        }

        return Err("Thumbnail generation failed".to_string());
    }

    let pool = cache_manager.thumbnail_pool();

    let owned_path = original_path.to_owned();

    let cache_path_clone = cache_path.clone();
    let inflight_map = cache_manager.inflight_thumbnail_generation_map();
    let inflight_key = cache_path.clone();
    let inflight_signal = inflight_sender.clone();

    let (transmitter, receiver) = oneshot::channel();

    pool.spawn(move || {
        let result: Result<(PathBuf, u32, u32), anyhow::Error> = (|| {
            generate_thumbnail(&owned_path, &cache_path_clone)?;

            let (width, height) = image_dimensions(&cache_path_clone)?;

            Ok((cache_path_clone, width, height))
        })();

        let _ = inflight_signal.send(true);

        if let Ok(mut map) = inflight_map.lock() {
            map.remove(&inflight_key);
        }

        if transmitter.send(result).is_err() {
            error!(
                "Unable to send thumbnail generation result for {}",
                owned_path
            );
        }
    });

    match receiver
        .await
        .map_err(|error| format!("Thumbnail generation cancelled: {error}"))?
    {
        Ok((path, width, height)) => Ok(ThumbnailInfo {
            path,
            width,
            height,
        }),
        Err(error) => Err(error.to_string()),
    }
}
