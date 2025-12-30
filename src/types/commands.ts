import { FileAnnotation, RatingEntry } from "./file-annotations";
import { TreeNode } from "./file-system";

export interface CommandArgs {
  get_home_dir: null;
  get_children_dir_paths: { rootDirPath: string | null; scanLevel: number };
  get_thumbnail: { path: string };
  prefetch_thumbnails: { paths: string[] };
  prepare_preview: { path: string };
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
  };
  update_viewport: { x: number; y: number; width: number; height: number };
  update_transform: { scale: number; offsetX: number; offsetY: number };
  render_frame: null;
  should_render_frame: null;
  set_render_state: { stateStr: "active" | "idle" | "paused" };
  clear_renderer: null;
  set_ratings: { entries: RatingEntry[] };
  set_flag: { path: string; flag: string };
  get_annotations: { paths: string[] };
}

export interface CommandReturn {
  get_home_dir: string;
  get_children_dir_paths: TreeNode[];
  get_thumbnail: string;
  prefetch_thumbnails: void;
  prepare_preview: { path: string; width: number; height: number };
  start_folder_scan: void;
  init_renderer: void;
  resize_surface: void;
  load_image: void;
  update_viewport: void;
  update_transform: void;
  render_frame: void;
  should_render_frame: boolean;
  set_render_state: void;
  clear_renderer: void;
  set_ratings: void;
  set_flag: void;
  get_annotations: FileAnnotation[];
}
