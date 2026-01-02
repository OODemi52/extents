export type ExifMetadata = {
  make: string | null;
  model: string | null;
  lensMake: string | null;
  lensModel: string | null;
  iso: number | null;
  shutterSpeed: number | null;
  aperture: number | null;
  focalLength: number | null;
  exposureBias: number | null;
  whiteBalance: number | null;
  meteringMode: number | null;
  exposureProgram: number | null;
  colorSpace: number | null;
  flash: number | null;
  dateTaken: string | null;
  orientation: number | null;
  width: number | null;
  height: number | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsAltitude: number | null;
};

export type ImageExifEntry = {
  file_path: string;
  file_size: number;
  modified_time: number;
  metadata: ExifMetadata;
};
