import * as adjustments from "./adjustments";
import * as annotations from "./annotations";
import * as fs from "./file-system";
import * as image from "./image";
import * as thumbnails from "./thumbnails";
import * as renderer from "./renderer";
import * as exif from "./exif";
import * as settings from "./settings";
import * as sidecar from "./sidecar";

export type { PreviewInfo } from "./image";

export const api = {
  adjustments,
  annotations,
  fs,
  image,
  thumbnails,
  renderer,
  exif,
  settings,
  sidecar,
};
