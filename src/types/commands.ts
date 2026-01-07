import { FileAnnotation, FlagEntry, RatingEntry } from "./file-annotations";
import { ImageExifEntry } from "./exif";
import { HistogramData } from "./histogram";
import { TreeNode } from "./file-system";
import { CacheType } from "./settings";

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
  get_cache_size: { cacheType: CacheType };
  clear_cache: { cacheType: CacheType };
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
  get_cache_size: number;
  clear_cache: void;
}
