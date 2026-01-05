# Extents app context and scrubbing memory issue

## Application overview
- This is a Tauri desktop app. Rust backend in `src-tauri`, React/TypeScript frontend in `src`.
- The app is an image viewer with RAW support. It scans folders, shows a grid/filmstrip, and renders a detail view.
- It uses a cache for thumbnails and previews in `~/Library/Caches/com.extents.app/`.
- Rendering is handled by a `Renderer` that accepts image textures (RGBA) and updates a GPU texture.

## Current problem
When scrubbing through many images (holding arrow keys to move selection quickly), RAM usage spikes severely, especially with RAW files (ARW). In some cases, release builds spike to 20GB+ and can crash. In dev, after the most recent fix, the deferral behavior looks correct in logs; in the release build the RAM spike still happens.

Observed behaviors:
- Before fixes: every selection triggered a full decode; `defer_full=false` for every request, so holding an arrow key rapidly kicked off many full decodes.
- After fixes in dev: `defer_full=true` during scrubbing, only one `start_full_image_load` after scrubbing ends.
- Release build still shows large memory spikes (even though deferral appears correct in dev logs).

## Goal
- While scrubbing, show a fast proxy (thumbnail or preview) and **do not** start full decode.
- When the user settles, start full decode for the last selected image only.
- Keep RAM spikes under control during scrubbing, especially on RAW folders.

## Architecture overview (relevant pipeline)
1. Folder scan -> list of image paths.
2. Thumbnails are generated or reused from cache.
3. Previews are generated or reused from cache.
4. Renderer flow:
   - `load_image` can load a proxy texture (preview/thumbnail) and optionally start full decode.
   - `start_full_image_load` starts full decode later.
   - `swap_requested_texture` swaps a proxy texture after a request is started.

## Changes and experiments so far
1. **Split full decode from initial load**
   - Added `start_full_image_load` command to allow deferring full decode.
   - `load_image` now accepts `defer_full_image_load` to skip full decode when scrubbing.
2. **Scrubbing detection**
   - First attempt: `useSelectionScrub` inferred scrubbing by timing between selection changes. It was too slow because it updated after the selection change; `load_image` always saw `defer_full=false`.
   - New approach: track `isScrubbing` directly in a Zustand store and set it synchronously in the keyboard navigation handler before changing selection.
3. **Fixed payload mismatch**
   - Backend expects `defer_full_image_load`, which maps to camelCase `deferFullImageLoad` in the Tauri payload.
   - The frontend originally sent `deferFull`, so backend always defaulted to false. This was fixed.
4. **Preview gating**
   - `useImagePreview` is disabled while scrubbing to reduce work.

## Current status
- Dev logs now show `defer_full=true` during scrubbing, and `start_full_image_load` only when scrubbing stops.
- Release build still shows large RAM spikes while scrubbing. We need to determine why.

## Hypotheses for release behavior
- Key repeat cadence in release is slower than the scrub settle window (180ms). If so, `isScrubbing` might clear between repeats, allowing full decode to start per step.
- Even if full decode is deferred, preview generation or decoding might still be heavy and concurrent enough to spike memory.
- Allocator behavior in release may hold onto peak memory longer, making spikes appear larger in Activity Monitor.

## Repro steps
1. Build and run release.
2. Open a folder with many RAW files (e.g., ~90 ARW).
3. Hold arrow key to scrub quickly.
4. Observe memory spikes in Activity Monitor.

## Example log excerpts
### Before payload fix (bad)
```
[CMD] Image request 2 defer_full=false preview=...
[CMD] Starting full decode request 2 path ...
```

### After payload fix (dev, expected)
```
[CMD] Image request 2 defer_full=true preview=...
[CMD] Deferring full decode for request 2
...
[CMD] start_full_image_load request 50 path ...
[CMD] Starting full decode request 50 path ...
```

---

# Code references

## src-tauri/src/commands/renderer.rs
```rs
use crate::core::image::decode_full_image;
use crate::renderer::{RenderState, Renderer};
use crate::state::AppState;
use anyhow::Result;
use log::{error, info, warn};
use std::sync::Arc;
use std::time::Instant;
use tauri::async_runtime;
use tauri::{State, WebviewWindow};

#[tauri::command]
pub fn init_renderer(state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();
    if renderer_lock.is_some() {
        warn!("Renderer already initialized.");
        return;
    }

    info!("Initializing renderer...");

    // SAFETY: This transmute extends the lifetime of the window reference.
    // This is safe because:
    // 1. The window is owned by AppState which lives for the entire app lifetime
    // 2. The renderer is also owned by AppState and will be dropped before the window
    // 3. We never access the window after the app is closed
    let window_ref: &'static WebviewWindow = unsafe { std::mem::transmute(&state.window) };

    *renderer_lock = Some(Renderer::new(window_ref));

    renderer_lock.as_mut().unwrap().render();
}

#[tauri::command]
pub fn resize_surface(width: u32, height: u32, state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.resize(width, height);
    }
}

#[tauri::command]
pub fn load_image(
    path: String,
    preview_path: Option<String>,
    viewport_x: u32,
    viewport_y: u32,
    viewport_width: u32,
    viewport_height: u32,
    defer_full_image_load: Option<bool>,
    state: State<AppState>,
) -> Result<u64, String> {
    info!("[CMD] Loading image from path: {}", path);
    let defer_full = defer_full_image_load.unwrap_or(false);
    let preview_label = preview_path.as_deref().unwrap_or("<none>");

    let renderer_handle = state.renderer.clone();

    let request_id = {
        let mut renderer_lock = renderer_handle.lock().unwrap();
        if let Some(renderer) = renderer_lock.as_mut() {
            renderer.update_proxy_viewport(
                viewport_x as f32,
                viewport_y as f32,
                viewport_width as f32,
                viewport_height as f32,
            );

            let request_id = renderer.begin_image_request();
            info!(
                "[CMD] Image request {} defer_full={} preview={}",
                request_id, defer_full, preview_label
            );

            if let Some(preview_path) = preview_path {
                if let Err(err) = load_texture_from_path(renderer, &preview_path) {
                    warn!(
                        "[CMD] Failed to load preview texture from {}: {}",
                        preview_path, err
                    );
                } else {
                    renderer.render();
                }
            }

            request_id
        } else {
            return Err("Renderer not initialized".to_string());
        }
    };

    if !defer_full {
        spawn_full_image_load(path, request_id, renderer_handle.clone());
    } else {
        info!("[CMD] Deferring full decode for request {}", request_id);
    }

    Ok(request_id)
}

#[tauri::command]
pub fn start_full_image_load(
    path: String,
    request_id: u64,
    state: State<AppState>,
) -> Result<(), String> {
    info!(
        "[CMD] start_full_image_load request {} path {}",
        request_id, path
    );
    let renderer_handle = state.renderer.clone();

    let should_start = {
        let renderer_lock = renderer_handle.lock().unwrap();
        let renderer = match renderer_lock.as_ref() {
            Some(renderer) => renderer,
            None => return Err("Renderer not initialized".to_string()),
        };

        renderer.is_request_active(request_id)
    };

    if !should_start {
        info!(
            "[CMD] start_full_image_load skipped (inactive request {})",
            request_id
        );
        return Ok(());
    }

    spawn_full_image_load(path, request_id, renderer_handle);

    Ok(())
}

fn load_texture_from_path(renderer: &mut Renderer, path: &str) -> Result<()> {
    let (raw, width, height) = decode_full_image(path)?;

    let has_alpha = raw.chunks_exact(4).any(|pixel| pixel[3] < 255);

    renderer.display_checkboard(has_alpha);

    renderer.update_texture(&raw, width, height);

    Ok(())
}

fn spawn_full_image_load(
    path: String,
    request_id: u64,
    renderer_handle: Arc<std::sync::Mutex<Option<Renderer<'static>>>>,
) {
    let renderer_for_task = renderer_handle.clone();
    let cloned_path_for_logging = path.clone();
    info!(
        "[CMD] Starting full decode request {} path {}",
        request_id, cloned_path_for_logging
    );

    let join_handle = async_runtime::spawn(async move {
        let decode_result =
            async_runtime::spawn_blocking(move || decode_full_image(&path)).await;

        match decode_result {
            Ok(Ok((rgba, width, height))) => {
                let mut renderer_lock = renderer_for_task.lock().unwrap();

                if let Some(renderer) = renderer_lock.as_mut() {
                    if renderer.is_request_active(request_id) {
                        let has_alpha = rgba.chunks_exact(4).any(|pixel| pixel[3] < 255);

                        renderer.display_checkboard(has_alpha);
                        renderer.update_texture(&rgba, width, height);

                        renderer.render();

                        renderer.complete_image_request(request_id);
                    }
                }
            }
            Ok(Err(err)) => {
                error!(
                    "[CMD] Failed to decode full image {}: {}",
                    cloned_path_for_logging,
                    err.to_string()
                );

                let mut renderer_lock = renderer_for_task.lock().unwrap();
                if let Some(renderer) = renderer_lock.as_mut() {
                    renderer.complete_image_request(request_id);
                }
            }
            Err(join_err) => {
                error!(
                    "[CMD] Image decode task panicked for {}: {:?}",
                    cloned_path_for_logging, join_err
                );

                let mut renderer_lock = renderer_for_task.lock().unwrap();
                if let Some(renderer) = renderer_lock.as_mut() {
                    renderer.complete_image_request(request_id);
                }
            }
        }
    });

    let mut renderer_lock = renderer_handle.lock().unwrap();
    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.attach_load_handle(request_id, join_handle);
    }
}

#[tauri::command]
pub async fn swap_requested_texture(
    path: String,
    request_id: u64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!(
        "[CMD] swap_requested_texture request {} path {}",
        request_id, path
    );
    let renderer_handle = state.renderer.clone();

    let decode_result =
        async_runtime::spawn_blocking(move || decode_full_image(&path)).await;

    match decode_result {
        Ok(Ok((raw, width, height))) => {
            let mut renderer_lock = renderer_handle.lock().unwrap();
            if let Some(renderer) = renderer_lock.as_mut() {
                if renderer.is_request_active(request_id) {
                    let has_alpha = raw.chunks_exact(4).any(|pixel| pixel[3] < 255);

                    renderer.display_checkboard(has_alpha);
                    renderer.update_texture(&raw, width, height);
                    renderer.render();
                }
            }

            Ok(())
        }
        Ok(Err(err)) => Err(err.to_string()),
        Err(join_err) => Err(format!(
            "Proxy texture decode task panicked: {:?}",
            join_err
        )),
    }
}

#[tauri::command]
pub fn update_viewport(x: f32, y: f32, width: f32, height: f32, state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.update_proxy_viewport(x, y, width, height);

        renderer.update_vertices();
    }
}

#[tauri::command]
pub fn update_transform(scale: f32, offset_x: f32, offset_y: f32, state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.update_transform(scale, offset_x, offset_y);

        renderer.render();
    }
}

#[tauri::command]
pub fn should_render_frame(state: State<AppState>) -> bool {
    if let Some(renderer) = state.renderer.lock().unwrap().as_ref() {
        renderer.should_render()
    } else {
        false
    }
}

#[tauri::command]
pub fn render_frame(state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.render();
        renderer.last_render = Instant::now();
    }
}

#[tauri::command]
pub fn clear_renderer(state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.clear();
    }
}

#[tauri::command]
pub fn set_render_state(state_str: String, state: State<AppState>) {
    if let Some(renderer) = state.renderer.lock().unwrap().as_mut() {
        println!("Render state changed to: {}", state_str);

        renderer.render_state = match state_str.as_str() {
            "active" => RenderState::Active,
            "idle" => RenderState::Idle,
            "paused" => RenderState::Paused,
            _ => RenderState::Idle,
        };
    }
}

rs

```

## src-tauri/src/commands/image.rs
```rs
use std::path::PathBuf;

use image::ImageReader;
use log::error;
use serde::Serialize;
use tauri::Manager;

use crate::core::cache::manager::{CacheManager, CacheType};
use crate::core::image::{
    compute_histogram, get_or_create_preview, get_or_create_thumbnail, Histogram, PreviewInfo,
};

#[tauri::command]
pub async fn get_thumbnail(path: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    let cache_manager = app_handle.state::<CacheManager>();

    let thumbnail = get_or_create_thumbnail(&cache_manager, &path).await?;

    Ok(thumbnail.path.to_string_lossy().into_owned())
}

#[derive(Serialize)]
pub struct PreviewResponse {
    pub path: String,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub async fn prepare_preview(
    path: String,
    app_handle: tauri::AppHandle,
) -> Result<PreviewResponse, String> {
    let cache_manager = app_handle.state::<CacheManager>();
    let PreviewInfo {
        path: cached,
        width,
        height,
    } = get_or_create_preview(&cache_manager, &path).await?;

    Ok(PreviewResponse {
        path: cached.to_string_lossy().into_owned(),
        width,
        height,
    })
}

#[tauri::command]
pub async fn get_histogram(
    path: String,
    app_handle: tauri::AppHandle,
) -> Result<Histogram, String> {
    let cache_manager = app_handle.state::<CacheManager>();
    let PreviewInfo { path: cached, .. } = get_or_create_preview(&cache_manager, &path).await?;

    let image = ImageReader::open(&cached)
        .map_err(|error| format!("Failed to open preview: {}", error))?
        .decode()
        .map_err(|error| format!("Failed to decode preview: {}", error))?
        .to_rgba8();

    Ok(compute_histogram(&image))
}

#[tauri::command]
pub fn prefetch_thumbnails(paths: Vec<String>, app_handle: tauri::AppHandle) -> Result<(), String> {
    let cache_manager = app_handle.state::<CacheManager>();

    let base_cache_path = cache_manager.base_cache_path.clone();
    let thumbnail_pool = cache_manager.thumbnail_pool();
    let inflight_thumbnail_generation_map = cache_manager.inflight_thumbnail_generation_map();
    let raw_prefetch_limiter = cache_manager.raw_prefetch_limiter();

    let cache_subdirectory = base_cache_path.join(CacheType::Thumbnail.sub_directory());

    std::thread::spawn(move || {
        thumbnail_pool.install(|| {
            use rayon::prelude::*;
            use tokio::sync::watch;

            paths.par_iter().for_each(|path| {
                let raw_prefetch_limiter = raw_prefetch_limiter.clone();
                match get_cache_path_direct(path, &cache_subdirectory) {
                    Ok(cache_path) => {
                        if !cache_path.exists() {
                            let inflight_sender = {
                                let mut map = match inflight_thumbnail_generation_map.lock() {
                                    Ok(guard) => guard,
                                    Err(_) => {
                                        error!("Failed to lock inflight thumbnail map");
                                        return;
                                    }
                                };

                                if map.contains_key(&cache_path) {
                                    return;
                                }

                                let (sender, _receiver) = watch::channel(false);
                                map.insert(cache_path.clone(), sender.clone());
                                sender
                            };

                            if let Err(error) =
                                crate::core::cache::generator::generate_thumbnail_prefetch(
                                    path,
                                    &cache_path,
                                    raw_prefetch_limiter,
                                )
                            {
                                error!("Prefetch failed for {}: {}", path, error);
                            }

                            let _ = inflight_sender.send(true);

                            if let Ok(mut map) = inflight_thumbnail_generation_map.lock() {
                                map.remove(&cache_path);
                            }
                        }
                    }
                    Err(error) => {
                        error!("Failed to get cache path for {}: {}", path, error);
                    }
                }
            });
        });

    });

    Ok(())
}

fn get_cache_path_direct(
    original_path: &str,
    cache_dir: &std::path::Path,
) -> Result<PathBuf, String> {
    use std::time::SystemTime;

    let path = std::path::Path::new(original_path);

    let metadata =
        std::fs::metadata(path).map_err(|error| format!("Failed to get metadata: {}", error))?;

    let modification_time = metadata
        .modified()
        .map_err(|error| format!("File system doesn't support modification time: {}", error))?;

    let modification_time_secs = modification_time
        .duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|error| format!("System time error: {}", error))?
        .as_secs();

    let mut hasher = blake3::Hasher::new();

    hasher.update(original_path.as_bytes());
    hasher.update(&modification_time_secs.to_le_bytes());

    let hash = hasher.finalize();

    let cache_filename = format!("{}.jpg", hash.to_hex());

    Ok(cache_dir.join(cache_filename))
}

```

## src-tauri/src/core/image/preview.rs
```rs
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

```

## src/types/commands.ts
```ts
import { FileAnnotation, FlagEntry, RatingEntry } from "./file-annotations";
import { ImageExifEntry } from "./exif";
import { HistogramData } from "./histogram";
import { TreeNode } from "./file-system";

export interface CommandArgs {
  get_home_dir: null;
  get_children_dir_paths: { rootDirPath: string | null; scanLevel: number };
  get_thumbnail: { path: string };
  prefetch_thumbnails: { paths: string[] };
  prepare_preview: { path: string };
  get_histogram: { path: string };
  start_folder_scan: { folderPath: string };
  init_renderer: null;
  resize_surface: { width: number; height: number };
  load_image: {
    path: string;
    previewPath?: string | null;
    viewportX: number;
    viewportY: number;
    viewportWidth: number;
    viewportHeight: number;
    deferFullImageLoad?: boolean | null;
  };
  start_full_image_load: { path: string; requestId: number };
  swap_requested_texture: { path: string; requestId: number };
  update_viewport: { x: number; y: number; width: number; height: number };
  update_transform: { scale: number; offsetX: number; offsetY: number };
  render_frame: null;
  should_render_frame: null;
  set_render_state: { stateStr: "active" | "idle" | "paused" };
  clear_renderer: null;
  set_ratings: { entries: RatingEntry[] };
  set_flags: { entries: FlagEntry[] };
  get_annotations: { paths: string[] };
  get_exif_metadata: { paths: string[] };
}

export interface CommandReturn {
  get_home_dir: string;
  get_children_dir_paths: TreeNode[];
  get_thumbnail: string;
  prefetch_thumbnails: void;
  prepare_preview: { path: string; width: number; height: number };
  get_histogram: HistogramData;
  start_folder_scan: void;
  init_renderer: void;
  resize_surface: void;
  load_image: number;
  start_full_image_load: void;
  swap_requested_texture: void;
  update_viewport: void;
  update_transform: void;
  render_frame: void;
  should_render_frame: boolean;
  set_render_state: void;
  clear_renderer: void;
  set_ratings: void;
  set_flags: void;
  get_annotations: FileAnnotation[];
  get_exif_metadata: ImageExifEntry[];
}

```

## src/services/api/renderer.ts
```ts
import type { CommandArgs } from "@/types/commands";

import { invokeTauri } from "./_client";

export type RenderState = CommandArgs["set_render_state"]["stateStr"];

export const initRenderer = () => invokeTauri("init_renderer", null);

export const setRenderState = (state: RenderState) =>
  invokeTauri("set_render_state", { stateStr: state });

export const syncViewport = (viewport: CommandArgs["update_viewport"]) =>
  invokeTauri("update_viewport", viewport);

export const loadImage = (payload: CommandArgs["load_image"]) =>
  invokeTauri("load_image", payload);

export const startFullImageLoad = (
  payload: CommandArgs["start_full_image_load"],
) => invokeTauri("start_full_image_load", payload);

export const swapRequestedTexture = (
  payload: CommandArgs["swap_requested_texture"],
) => invokeTauri("swap_requested_texture", payload);

export const updateTransform = (payload: CommandArgs["update_transform"]) =>
  invokeTauri("update_transform", payload);

export const resizeSurface = (payload: CommandArgs["resize_surface"]) =>
  invokeTauri("resize_surface", payload);

export const renderFrame = () => invokeTauri("render_frame", null);

export const shouldRenderFrame = () => invokeTauri("should_render_frame", null);

export const prefetch = (paths: string[]): Promise<void> => {
  return invokeTauri("prefetch_thumbnails", { paths });
};

export const clearRenderer = () => invokeTauri("clear_renderer", null);

```

## src/features/gallery/hooks/use-image-keyboard-navigation.ts
```ts
import { useEffect, useRef } from "react";

import { useImageLoader } from "@/hooks/use-image-loader";
import { useImageStore } from "@/store/image-store";

const SCRUB_SETTLE_MS = 180;

function shouldIgnoreTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.getAttribute("role") === "textbox"
  );
}

export function useImageKeyboardNavigation(paths: string[], enabled = true) {
  const { handleSelectImageByPath } = useImageLoader();
  const { files, selectedIndex } = useImageStore();
  const hasImages = paths.length > 0;
  const scrubTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !hasImages) {
      if (scrubTimeoutRef.current !== null) {
        clearTimeout(scrubTimeoutRef.current);
        scrubTimeoutRef.current = null;
      }
      useImageStore.getState().setIsScrubbing(false);
      return;
    }

    const clearScrubTimeout = () => {
      if (scrubTimeoutRef.current !== null) {
        clearTimeout(scrubTimeoutRef.current);
        scrubTimeoutRef.current = null;
      }
    };

    const scheduleScrubClear = () => {
      clearScrubTimeout();
      scrubTimeoutRef.current = window.setTimeout(() => {
        scrubTimeoutRef.current = null;
        useImageStore.getState().setIsScrubbing(false);
      }, SCRUB_SETTLE_MS);
    };

    const markScrubbing = () => {
      const { isScrubbing, setIsScrubbing } = useImageStore.getState();
      if (!isScrubbing) {
        setIsScrubbing(true);
      }
      scheduleScrubClear();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || shouldIgnoreTarget(event.target)) {
        return;
      }

      const currentPath =
        selectedIndex !== null
          ? (files[selectedIndex]?.path ?? null)
          : null;

      const currentIndex = currentPath ? paths.indexOf(currentPath) : -1;

      const selectByIndex = (index: number) => {
        const path = paths[index];

        if (!path || path === currentPath) {
          return;
        }

        markScrubbing();
        handleSelectImageByPath(path);
      };

      const selectRelative = (delta: number) => {
        if (delta === 0 || paths.length === 0) {
          return;
        }

        const baseIndex =
          currentIndex !== -1 ? currentIndex : delta > 0 ? -1 : paths.length;
        const nextIndex = Math.min(
          Math.max(baseIndex + delta, 0),
          paths.length - 1,
        );

        if (nextIndex === baseIndex) {
          return;
        }

        selectByIndex(nextIndex);
      };

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          selectByIndex(0);
        } else {
          selectRelative(-1);
        }
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          selectByIndex(paths.length - 1);
        } else {
          selectRelative(1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearScrubTimeout();
      useImageStore.getState().setIsScrubbing(false);
    };
  }, [
    enabled,
    hasImages,
    paths,
    files,
    selectedIndex,
    handleSelectImageByPath,
  ]);
}

```

## src/store/image-store.ts
```ts
import { create } from "zustand";
import { convertFileSrc } from "@tauri-apps/api/core";

import { FileMetadata } from "../types/image";

import { useImageTransformStore } from "./transform-store";

interface ImageStore {
  files: FileMetadata[];
  selectedIndex: number | null;
  selectedPaths: Set<string>;
  currentImageData: string | null;
  isLoading: boolean;
  isScrubbing: boolean;

  currentFolderPath: string | null;
  folderList: string[];

  setFiles: (list: FileMetadata[]) => void;
  appendFiles: (list: FileMetadata[]) => void;
  setSelectedIndex: (index: number | null) => void;
  selectSingleByIndex: (index: number) => void;
  toggleSelectionByIndex: (index: number) => void;
  selectRelative: (delta: number) => void;
  selectFirst: () => void;
  selectLast: () => void;
  selectAll: (paths: string[]) => void;
  selectInverse: (paths: string[]) => void;
  deselectAll: () => void;
  setCurrentImageData: (data: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsScrubbing: (scrubbing: boolean) => void;
  setThumbnailPath: (originalPath: string, cachePath: string) => void;

  setCurrentFolderPath: (path: string | null) => void;
  setFolderList: (folders: string[]) => void;
}

type ImageSelectionState = Pick<
  ImageStore,
  "files" | "selectedIndex" | "selectedPaths"
>;

type ImageIndexState = Pick<ImageStore, "files" | "selectedIndex">;

const getPathAtIndex = (state: ImageSelectionState, index: number) =>
  state.files[index]?.path ?? null;

const resetTransformIfChanged = (
  state: ImageSelectionState,
  nextIndex: number,
) => {
  if (nextIndex !== state.selectedIndex) {
    useImageTransformStore.getState().resetTransform();
  }
};

const findIndexByPath = (
  state: Pick<ImageStore, "files">,
  path: string,
) => state.files.findIndex((file) => file.path === path);

const getRelativeIndex = (state: ImageIndexState, delta: number) => {
  const total = state.files.length;

  if (total === 0 || delta === 0) {
    return null;
  }

  const current =
    state.selectedIndex !== null ? state.selectedIndex : delta > 0 ? -1 : total;
  const next = Math.min(Math.max(current + delta, 0), total - 1);

  if (next === state.selectedIndex) {
    return null;
  }

  return next;
};

export const useImageStore = create<ImageStore>((set, get) => {
  const selectSingleByIndex = (index: number) => {
    set((state) => {
      const path = getPathAtIndex(state, index);

      if (!path) {
        return {};
      }

      const isAlreadySelected =
        state.selectedIndex === index &&
        state.selectedPaths.size === 1 &&
        state.selectedPaths.has(path);

      if (isAlreadySelected) {
        return {};
      }

      resetTransformIfChanged(state, index);

      return { selectedIndex: index, selectedPaths: new Set([path]) };
    });
  };

  const toggleSelectionByIndex = (index: number) => {
    set((state) => {
      const path = getPathAtIndex(state, index);

      if (!path) {
        return {};
      }

      const nextSelected = new Set(state.selectedPaths);

      if (nextSelected.has(path)) {
        nextSelected.delete(path);
      } else {
        nextSelected.add(path);
      }

      return { selectedPaths: nextSelected };
    });
  };

  const setActiveIndexFromPath = (state: ImageSelectionState, path: string) => {
    const index = findIndexByPath(state, path);

    if (index < 0) {
      return null;
    }

    resetTransformIfChanged(state, index);

    return index;
  };

  return {
    files: [],
    selectedIndex: null,
    selectedPaths: new Set(),
    currentImageData: null,
    isLoading: false,
    isScrubbing: false,

    currentFolderPath: null,
    folderList: [],

    setFileMetadataList: (list) =>
      set((state) => {
        const nextPaths = new Set(list.map((file) => file.path));
        const nextSelectedPaths = new Set(
          [...state.selectedPaths].filter((path) => nextPaths.has(path)),
        );

        return { files: list, selectedPaths: nextSelectedPaths };
      }),
    appendFiles: (list) =>
      set((state) => ({
        files: [...state.files, ...list],
      })),
    setSelectedIndex: (index: number | null) => {
      if (index === null) {
        set({ selectedIndex: null, selectedPaths: new Set() });

        return;
      }

      set((state) => {
        if (index < 0 || index >= state.files.length) {
          return {};
        }

        if (index === state.selectedIndex) {
          return {};
        }

        resetTransformIfChanged(state, index);

        return { selectedIndex: index };
      });
    },
    selectSingleByIndex,
    toggleSelectionByIndex,
    selectRelative: (delta: number) => {
      const nextIndex = getRelativeIndex(get(), delta);

      if (nextIndex !== null) {
        selectSingleByIndex(nextIndex);
      }
    },
    selectFirst: () => {
      const { files, selectedIndex } = get();

      if (!files.length || selectedIndex === 0) {
        return;
      }

      selectSingleByIndex(0);
    },
    selectLast: () => {
      const { files, selectedIndex } = get();
    const lastIndex = files.length - 1;

      if (!files.length || selectedIndex === lastIndex) {
        return;
      }

      selectSingleByIndex(lastIndex);
    },
    selectAll: (paths) => {
      if (!paths.length) {
        return;
      }

      set((state) => {
        const nextSelected = new Set(paths);
        let nextIndex = state.selectedIndex;

        if (nextIndex === null) {
          const firstPath = paths[0];
          const index = setActiveIndexFromPath(state, firstPath);

          if (index !== null) {
            nextIndex = index;
          }
        }

        return { selectedIndex: nextIndex, selectedPaths: nextSelected };
      });
    },
    selectInverse: (paths) => {
      if (!paths.length) {
        return;
      }

      set((state) => {
        const nextSelected = new Set(state.selectedPaths);

        for (const path of paths) {
          if (nextSelected.has(path)) {
            nextSelected.delete(path);
          } else {
            nextSelected.add(path);
          }
        }

        let nextIndex = state.selectedIndex;

        if (nextIndex === null && nextSelected.size > 0) {
          const firstSelected = paths.find((path) => nextSelected.has(path));

          if (firstSelected) {
            const index = setActiveIndexFromPath(state, firstSelected);

            if (index !== null) {
              nextIndex = index;
            }
          }
        }

        return { selectedIndex: nextIndex, selectedPaths: nextSelected };
      });
    },
    deselectAll: () =>
      set((state) =>
        state.selectedPaths.size ? { selectedPaths: new Set() } : {},
      ),
    setCurrentImageData: (data) => set({ currentImageData: data }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setIsScrubbing: (scrubbing) => set({ isScrubbing: scrubbing }),
    setThumbnailPath: (originalPath, cachePath) => {
      set((state) => ({
        files: state.files.map((file) =>
          file.path === originalPath
            ? { ...file, thumbnailPath: convertFileSrc(cachePath) }
            : file,
        ),
      }));
    },

    setCurrentFolderPath: (path) => set({ currentFolderPath: path }),
    setFolderList: (folders) => set({ folderList: folders }),
  };
});

```

## src/features/interaction-viewport/hooks/use-selection-scrub.ts
```ts
import { useImageStore } from "@/store/image-store";

export function useSelectionScrub() {
  return useImageStore((state) => state.isScrubbing);
}

```

## src/features/interaction-viewport/hooks/use-image-preview.ts
```ts
import type { PreviewInfo } from "@/services/api/image";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";

type UseImagePreviewOptions = {
  enabled?: boolean;
};

export function useImagePreview(
  path: string | null,
  options: UseImagePreviewOptions = {},
) {
  const shouldEnable = options.enabled ?? Boolean(path);
  const { data, isLoading, error } = useQuery<PreviewInfo>({
    queryKey: ["image-preview", path],
    queryFn: async () => {
      if (!path) {
        throw new Error("No image path provided");
      }
      const result = await api.image.preparePreview(path);

      return result;
    },
    enabled: shouldEnable,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  return {
    preview: data,
    isLoading,
    error: errorMessage,
  };
}

```

## src/features/interaction-viewport/hooks/use-viewport-sync.ts
```ts
import type { PreviewInfo } from "@/services/api/image";

import { useEffect, useRef, useCallback, useState } from "react";

import { api } from "@/services/api";

const VIEWPORT_DEBOUNCE_MS = 100;

export function useViewportSync(
  viewportRef: React.RefObject<HTMLDivElement>,
  preview: PreviewInfo | undefined,
  thumbnailPath: string | null,
  imagePath: string | null,
  isScrubbing: boolean,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  const lastLoadKeyRef = useRef<string | null>(null);
  const lastSwapPathRef = useRef<string | null>(null);
  const activeImagePathRef = useRef<string | null>(null);
  const [requestId, setRequestId] = useState<number | null>(null);
  const pendingFullRequestRef = useRef<{
    path: string;
    requestId: number;
  } | null>(null);
  const scrubbingRef = useRef(isScrubbing);
  const viewportTimeoutRef = useRef<number | null>(null);
  const transformTimeoutRef = useRef<number | null>(null);
  const lastTransformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  const updateViewport = useCallback(() => {
    if (!viewportRef.current) {
      return;
    }

    if (viewportTimeoutRef.current !== null) {
      clearTimeout(viewportTimeoutRef.current);
    }

    viewportTimeoutRef.current = window.setTimeout(() => {
      if (!viewportRef.current) return;

      const clientViewportDimensions =
        viewportRef.current.getBoundingClientRect();

      const devicePixelRatio = window.devicePixelRatio;

      api.renderer
        .syncViewport({
          x: clientViewportDimensions.x * devicePixelRatio,
          y: clientViewportDimensions.y * devicePixelRatio,
          width: clientViewportDimensions.width * devicePixelRatio,
          height: clientViewportDimensions.height * devicePixelRatio,
        })
        .catch((error) =>
          console.error("[useViewportSync] update_viewport failed:", error),
        );
    }, VIEWPORT_DEBOUNCE_MS);
  }, [viewportRef]);

  useEffect(() => {
    if (!viewportRef.current || !imagePath) {
      lastLoadKeyRef.current = null;
      lastSwapPathRef.current = null;
      activeImagePathRef.current = null;
      setRequestId(null);
      pendingFullRequestRef.current = null;

      return;
    }

    if (lastLoadKeyRef.current === imagePath) return;

    lastLoadKeyRef.current = imagePath;
    lastSwapPathRef.current = null;
    activeImagePathRef.current = imagePath;
    setRequestId(null);
    pendingFullRequestRef.current = null;

    const clientViewportDimensions =
      viewportRef.current.getBoundingClientRect();

    const devicePixelRatio = window.devicePixelRatio;
    const proxyPath = thumbnailPath ?? preview?.path ?? null;

    if (proxyPath) {
      lastSwapPathRef.current = proxyPath;
    }

    const shouldDeferFull = isScrubbing;

    let rafId: number | null = null;

    rafId = window.requestAnimationFrame(() => {
      api.renderer
        .loadImage({
          path: imagePath,
          previewPath: proxyPath,
          viewportX: clientViewportDimensions.x * devicePixelRatio,
          viewportY: clientViewportDimensions.y * devicePixelRatio,
          viewportWidth: clientViewportDimensions.width * devicePixelRatio,
          viewportHeight: clientViewportDimensions.height * devicePixelRatio,
          deferFullImageLoad: shouldDeferFull,
        })
        .then((nextRequestId) => {
          if (activeImagePathRef.current !== imagePath) {
            return;
          }

          setRequestId(nextRequestId);
          updateViewport();

          if (shouldDeferFull) {
            pendingFullRequestRef.current = {
              path: imagePath,
              requestId: nextRequestId,
            };

            if (!scrubbingRef.current) {
              const pending = pendingFullRequestRef.current;
              if (!pending || activeImagePathRef.current !== pending.path) {
                return;
              }

              pendingFullRequestRef.current = null;

              api.renderer
                .startFullImageLoad({
                  path: pending.path,
                  requestId: pending.requestId,
                })
                .catch((error) =>
                  console.error(
                    "[useViewportSync] start_full_image_load failed:",
                    error,
                  ),
                );
            }
          }
        })
        .catch((error) =>
          console.error("[useViewportSync] load_image failed:", error),
        );
    });

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [imagePath, viewportRef, updateViewport]);

  useEffect(() => {
    scrubbingRef.current = isScrubbing;

    if (isScrubbing) return;

    const pending = pendingFullRequestRef.current;
    if (!pending) return;

    if (activeImagePathRef.current !== pending.path) {
      pendingFullRequestRef.current = null;
      return;
    }

    pendingFullRequestRef.current = null;

    api.renderer
      .startFullImageLoad({
        path: pending.path,
        requestId: pending.requestId,
      })
      .catch((error) =>
        console.error("[useViewportSync] start_full_image_load failed:", error),
      );
  }, [isScrubbing]);

  useEffect(() => {
    if (!requestId) return;

    const proxyPath = preview?.path ?? thumbnailPath;

    if (!proxyPath) return;
    if (lastSwapPathRef.current === proxyPath) return;

    lastSwapPathRef.current = proxyPath;

    api.renderer
      .swapRequestedTexture({ path: proxyPath, requestId })
      .catch((error) =>
        console.error(
          "[useViewportSync] swap_requested_texture failed:",
          error,
        ),
      );
  }, [preview?.path, requestId, thumbnailPath]);

  useEffect(() => {
    if (!viewportRef.current) return;

    const handleWindowResize = () => {
      updateViewport();
    };

    window.addEventListener("resize", handleWindowResize);

    updateViewport();

    return () => {
      window.removeEventListener("resize", handleWindowResize);

      if (viewportTimeoutRef.current !== null) {
        clearTimeout(viewportTimeoutRef.current);
      }
    };
  }, [updateViewport, viewportRef]);

  useEffect(() => {
    if (!preview) return;

    const lastTransform = lastTransformRef.current;

    if (
      lastTransform.scale === scale &&
      lastTransform.offsetX === offsetX &&
      lastTransform.offsetY === offsetY
    ) {
      return;
    }

    if (transformTimeoutRef.current !== null) {
      cancelAnimationFrame(transformTimeoutRef.current);
    }

    transformTimeoutRef.current = requestAnimationFrame(() => {
      lastTransformRef.current = { scale, offsetX, offsetY };

      api.renderer
        .updateTransform({ scale, offsetX, offsetY })
        .catch((error) =>
          console.error("[useViewportSync] update_transform failed:", error),
        );
    });

    return () => {
      if (transformTimeoutRef.current !== null) {
        cancelAnimationFrame(transformTimeoutRef.current);
      }
    };
  }, [scale, offsetX, offsetY, preview]);
}

```

## src/features/interaction-viewport/components/interaction-viewport.tsx
```tsx
import { useEffect, useRef } from "react";

import { useImagePreview } from "../hooks/use-image-preview";
import { useSelectionScrub } from "../hooks/use-selection-scrub";
import { useViewportThumbnail } from "../hooks/use-viewport-thumbnail";
import { useImageTransform } from "../hooks/use-image-transform";
import { useViewportSync } from "../hooks/use-viewport-sync";
import { useInteractionHandlers } from "../hooks/use-interaction-handlers";

import { useImageStore } from "@/store/image-store";
import { FilterMenuBar } from "@/features/filter/components/menu-bar/menu-bar";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { useFilteredImages } from "@/features/filter/hooks/use-filtered-files";
import { useImageLoader } from "@/hooks/use-image-loader";

export function InteractionViewport() {
  const { files, selectedIndex, isLoading } = useImageStore();
  const isFilterOpen = useFilterStore((state) => state.isOpen);
  const filteredFiles = useFilteredImages();
  const { handleSelectImageByPath } = useImageLoader();

  const viewportRef = useRef<HTMLDivElement>(null);

  const selected =
    selectedIndex !== null ? files[selectedIndex] : null;

  const imagePath = selected?.path || null;

  const isScrubbing = useSelectionScrub();

  const {
    preview,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useImagePreview(imagePath, {
    enabled: Boolean(imagePath) && !isScrubbing,
  });

  const { thumbnailPath } = useViewportThumbnail(imagePath);

  const { scale, offsetX, offsetY } = useImageTransform(imagePath);

  useViewportSync(
    viewportRef,
    preview,
    thumbnailPath,
    imagePath,
    isScrubbing,
    scale,
    offsetX,
    offsetY,
  );

  useInteractionHandlers(
    viewportRef,
    scale,
    offsetX,
    offsetY,
    Boolean(imagePath),
  );

  const showEmptyState = !imagePath && !isLoading && !isPreviewLoading;
  const showFilteredEmpty =
    !isLoading &&
    !isPreviewLoading &&
    filteredFiles.length === 0 &&
    files.length > 0;

  useEffect(() => {
    if (
      filteredFiles.length > 0 &&
      (!imagePath || !filteredFiles.some((file) => file.path === imagePath))
    ) {
      handleSelectImageByPath(filteredFiles[0].path);
    }
  }, [filteredFiles, imagePath, handleSelectImageByPath]);

  return (
    <div
      ref={viewportRef}
      className="w-full h-full relative flex flex-grow items-center justify-center bg-transparent p-4 touch-none"
    >
      <div
        className={`absolute top-0 left-0 w-full transition-all duration-200 ${
          isFilterOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        data-filter-ui="true"
      >
        <FilterMenuBar />
      </div>

      {isLoading && (
        <div className="absolute top-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-gray-300">
          Loading folder…
        </div>
      )}

      {previewError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <p className="rounded-lg bg-black bg-opacity-50 p-4 text-white">
            {previewError}
          </p>
        </div>
      )}

      {showEmptyState && !showFilteredEmpty && (
        <div className="text-center text-sm text-gray-500">
          {files.length
            ? "Select an image to view."
            : "No folder selected. Pick a folder to start."}
        </div>
      )}

      {showFilteredEmpty && (
        <div className="text-center text-sm text-gray-500">
          No images match the current filters.
        </div>
      )}
    </div>
  );
}
```
