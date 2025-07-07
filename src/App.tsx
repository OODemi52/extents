import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

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
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <button onClick={pickFolderAndListImages}>Pick Folder</button>

      {selectedImage && (
        <div style={{ marginTop: "1rem" }}>
          <img
            src={`data:image/*;base64,${selectedImage.base64}`}
            alt="Selected"
            style={{ width: "100%", maxHeight: "80vh", objectFit: "contain" }}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          overflowX: "auto",
          gap: "0.5rem",
          padding: "0.5rem",
          borderTop: "1px solid #ccc",
          marginTop: "1rem",
        }}
      >
        {images.map((image, idx) => (
          <img
            key={idx}
            src={`data:image/*;base64,${image.base64}`}
            alt={`Image ${idx}`}
            style={{
              width: "100px",
              height: "auto",
              cursor: "pointer",
              border:
                selectedImage?.path === image.path ? "2px solid blue" : "none",
            }}
            onClick={() => setSelectedImage(image)}
          />
        ))}
      </div>
    </main>
  );
}

export default App;
