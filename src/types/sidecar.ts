export type EditRecipe = {
  exposure_ev: number;
};

export type SidecarAppInfo = {
  name: string;
  version: string;
};

export type SidecarSourceInfo = {
  path_hint: string;
};

export type Sidecar = {
  version: number;
  process_version: number;
  updated_at: string;
  app: SidecarAppInfo;
  source: SidecarSourceInfo;
  recipe: EditRecipe;
};
