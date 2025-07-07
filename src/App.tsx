import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState, useCallback, useRef } from "react";

type ImageMetadata = {
  path: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  file_size: number;
  file_name: string;
};

type LoadedImage = {
  path: string;
  base64: string;
};

function App() {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
  const [currentImage, setCurrentImage] = useState<LoadedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // For virtualized filmstrip
  const filmstripRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  async function pickFolderAndListImages() {
    const folderPath = await open({ directory: true });

    if (typeof folderPath === "string") {
      setIsLoading(true);
      try {
        const imageMetadata: ImageMetadata[] = await invoke(
          "get_image_metadata",
          {
            folderPath,
          },
        );

        setImages(imageMetadata);
        // Load thumbnails for the first visible batch
        loadVisibleThumbnails(imageMetadata.slice(0, 20));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  }

  // Function to load thumbnails for visible items
  const loadVisibleThumbnails = useCallback(
    async (visibleImages: ImageMetadata[]) => {
      for (const image of visibleImages) {
        if (!image.thumbnail) {
          try {
            const thumbnail = await invoke("generate_thumbnail", {
              imagePath: image.path,
              maxSize: 100,
            });

            setImages((prev) =>
              prev.map((img) =>
                img.path === image.path
                  ? { ...img, thumbnail: thumbnail as string }
                  : img,
              ),
            );
          } catch (error) {
            console.error(`Failed to load thumbnail for ${image.path}:`, error);
          }
        }
      }
    },
    [],
  );

  // Load full image when selection changes
  useEffect(() => {
    async function loadSelectedImage() {
      if (selectedImageIndex !== null && images[selectedImageIndex]) {
        setIsLoading(true);
        try {
          const base64 = await invoke("load_single_image", {
            imagePath: images[selectedImageIndex].path,
          });

          setCurrentImage({
            path: images[selectedImageIndex].path,
            base64: base64 as string,
          });
        } catch (error) {
          console.error("Failed to load selected image:", error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadSelectedImage();
  }, [selectedImageIndex, images]);

  // Handle filmstrip scroll for virtualization
  const handleFilmstripScroll = useCallback(() => {
    if (!filmstripRef.current) return;

    const scrollLeft = filmstripRef.current.scrollLeft;
    const itemWidth = 120; // card width + gap
    const startIndex = Math.max(0, Math.floor(scrollLeft / itemWidth) - 5); // 5 items buffer
    const visibleItems =
      Math.ceil(filmstripRef.current.clientWidth / itemWidth) + 10; // 10 items buffer
    const endIndex = Math.min(images.length, startIndex + visibleItems);

    setVisibleRange({ start: startIndex, end: endIndex });
    loadVisibleThumbnails(images.slice(startIndex, endIndex));
  }, [images, loadVisibleThumbnails]);

  // Register scroll event handler
  useEffect(() => {
    const filmstrip = filmstripRef.current;

    if (filmstrip) {
      filmstrip.addEventListener("scroll", handleFilmstripScroll);

      return () =>
        filmstrip.removeEventListener("scroll", handleFilmstripScroll);
    }
  }, [handleFilmstripScroll]);

  // Preload adjacent images for smoother navigation
  const preloadAdjacentImages = useCallback(
    async (index: number) => {
      const preloadIndices = [index - 1, index + 1].filter(
        (i) => i >= 0 && i < images.length,
      );

      for (const idx of preloadIndices) {
        if (images[idx] && !images[idx].thumbnail) {
          try {
            await invoke("generate_thumbnail", {
              imagePath: images[idx].path,
              maxSize: 100,
            });
          } catch (error) {
            // Silently fail preloading
          }
        }
      }
    },
    [images],
  );

  useEffect(() => {
    if (selectedImageIndex !== null) {
      preloadAdjacentImages(selectedImageIndex);
    }
  }, [selectedImageIndex, preloadAdjacentImages]);

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Top bar */}
      <div className="p-4 bg-white dark:bg-gray-800 shadow-md flex justify-between items-center">
        <Button onPress={pickFolderAndListImages}>
          {images.length ? "Change Folder" : "Pick Folder"}
        </Button>
        {selectedImageIndex !== null && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {selectedImageIndex + 1} / {images.length} -{" "}
            {images[selectedImageIndex]?.file_name}
          </div>
        )}
      </div>

      {/* Main image area */}
      <div className="flex-grow flex items-center justify-center p-4 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            Loading...
          </div>
        )}

        {currentImage && (
          <img
            alt="Selected"
            className="max-w-full max-h-full object-contain transition-opacity duration-200"
            src={`data:image/*;base64,${currentImage.base64}`}
          />
        )}

        {!currentImage && !isLoading && (
          <div className="text-gray-500 dark:text-gray-400">
            {images.length ? "Select an image to view" : "No folder selected"}
          </div>
        )}
      </div>

      {/* Filmstrip */}
      <div
        ref={filmstripRef}
        className="h-32 flex overflow-x-auto gap-2 p-2 bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700"
      >
        {images.map((image, idx) => (
          <Card
            key={image.path}
            className={`min-w-[100px] h-24 flex-shrink-0 cursor-pointer transition-all duration-200 ${
              selectedImageIndex === idx
                ? "ring-2 ring-blue-500 shadow-lg transform scale-105"
                : "hover:scale-102"
            }`}
            onPress={() => setSelectedImageIndex(idx)}
          >
            {image.thumbnail ? (
              <img
                alt={image.file_name}
                className="w-[100px] h-24 object-cover"
                src={`data:image/jpeg;base64,${image.thumbnail}`}
              />
            ) : (
              <div className="w-[100px] h-24 bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                <div className="animate-pulse w-8 h-8 rounded-full bg-gray-400 dark:bg-gray-600" />
              </div>
            )}
          </Card>
        ))}
      </div>
    </main>
  );
}

export default App;
