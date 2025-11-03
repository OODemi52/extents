export type ImageMetadata = {
  path: string;
  fileName: string;
  width: number | null;
  height: number | null;
  fileSize: number;
  thumbnailPath?: string;
};

export interface ThumbnailProps {
  path: string;
  isSelected: boolean;
  onClick: () => void;
}

export interface FilmstripProps {
  fileMetadataList: ImageMetadata[];
  selectedIndex: number | null;
  onSelectImage: (index: number) => void;
}
