export type ImageMetadata = {
  path: string;
  file_name: string;
  // width: number;
  // height: number;
  // file_size: number;
  // thumbnail?: string;
};

export interface ThumbnailProps {
  path: string;
  isSelected: boolean;
  getThumbnail: (path: string) => Promise<string | null>;
  onClick: () => void;
}

export interface FilmstripProps {
  imagePaths: string[];
  selectedIndex: number | null;
  onSelectImage: (index: number) => void;
  getThumbnailForImage: (path: string) => Promise<string | null>;
}
