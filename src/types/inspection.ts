export type InspectionSnapshot = {
  hasImage: boolean;
  image: ImageInspection | null;
  pipeline: PipelineInspection;
  textures: TextureInspection;
  timings: TimingInspection;
};

export type ImageInspection = {
  sourceKind: string;
  width: number;
  height: number;
  hasTransparency: boolean;
  raw: RawImageInspection | null;
};

export type RawImageInspection = {
  cameraMake: string;
  cameraModel: string;
  bitsPerSample: number;
  sensorDimensions: DimensionsInspection;
  cropArea: RectInspection;
  cfa: CfaPatternInspection;
  sourceBlackLevels: number[];
  sourceWhiteLevels: number[];
  normalizedBlackLevels: number[];
  normalizedWhiteLevels: number[];
  asShotWhiteBalance: number[];
  headroomWhiteBalance: number[];
};

export type DimensionsInspection = {
  width: number;
  height: number;
};

export type RectInspection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CfaPatternInspection = {
  name: string;
  width: number;
  height: number;
  cells: CfaCellInspection[];
};

export type CfaCellInspection = {
  code: number;
  label: string;
};

export type PipelineInspection = {
  developmentSource: string;
  displayIntent: string;
  baseExposureEv: number | null;
  userExposureEv: number;
};

export type TextureInspection = {
  source: TextureResourceInspection;
  developmentOutput: TextureResourceInspection;
  adjustmentOutput: TextureResourceInspection;
  displayOutput: TextureResourceInspection;
  surface: TextureResourceInspection;
};

export type TextureResourceInspection = {
  label: string;
  format: string;
  width: number;
  height: number;
};

export type TimingInspection = {
  inputBuildMs: number | null;
};
