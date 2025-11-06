import { TreeNode } from "./file-system";

export interface CommandArgs {
  get_home_dir: null;
  get_children_dir_paths: { rootDirPath: string | null; scanLevel: number };
  get_thumbnail: { path: string };
  prefetch_thumbnails: { paths: string[] };
  prepare_preview: { path: string };
}

export interface CommandReturn {
  get_home_dir: string;
  get_children_dir_paths: TreeNode[];
  get_thumbnail: string;
  prefetch_thumbnails: void;
  prepare_preview: { path: string; width: number; height: number };
}
