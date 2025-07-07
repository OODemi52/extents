import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@heroui/button";

type ImageData = {
  path: string;
  base64: string;
};

function App() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);

  async function pickFolderAndListImages() {
    const folderPath = await open({ directory: true });

    if (typeof folderPath === "string") {
      console.log("Folder selected:", folderPath);

      try {
        const imageFiles: ImageData[] = await invoke("list_images_in_folder", {
          folderPath,
        });

        console.log("Images returned:", imageFiles);
        setImages(imageFiles);
      } catch (error) {
        console.error("Error invoking list_images_in_folder:", error);
      }
    } else {
      console.log("No folder selected.");
    }
  }

  return (
    <main className="overflow-hidden overscroll-none">
      {!selectedImage && (
        <Button onPress={pickFolderAndListImages}>Pick Folder</Button>
      )}

      {selectedImage && (
        <div className="mt-4">
          <img
            src={`data:image/*;base64,${selectedImage.base64}`}
            alt="Selected"
            className="w-full max-h-[80vh] object-contain"
          />
        </div>
      )}

      <div className="flex overflow-hidden overscroll-none gap-2 p-2 border-t border-gray-300 mt-4">
        {images.map((image, idx) => (
          <img
            key={idx}
            src={`data:image/*;base64,${image.base64}`}
            alt={`Image ${idx}`}
            className={`w-[100px] h-auto cursor-pointer ${
              selectedImage?.path === image.path
                ? "border-2 border-blue-500"
                : "border-none"
            }`}
            onClick={() => setSelectedImage(image)}
          />
        ))}
      </div>
    </main>
  );
}

export default App;
