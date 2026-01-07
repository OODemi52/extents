use crate::core::cache::manager::{CacheManager, CacheType};
use tauri::State;

#[tauri::command]
pub async fn get_cache_size(
    cache_type: CacheType,
    cache_manager: State<'_, CacheManager>,
) -> Result<u64, String> {
    cache_manager.get_cache_size(cache_type).await
}

#[tauri::command]
pub async fn clear_cache(
    cache_type: CacheType,
    cache_manager: State<'_, CacheManager>,
) -> Result<(), String> {
    cache_manager.clear_cache(cache_type).await
}
