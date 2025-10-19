import { useEffect } from "react";
import { Button } from "@heroui/button";
import { invoke } from "@tauri-apps/api/core";

type SidebarProps = {
  onPickFolder: () => void;
  hasImages: boolean;
};

export function Sidebar({ onPickFolder }: SidebarProps) {
  // Initialize the WGPU renderer once when the component mounts
  useEffect(() => {
    const init = async () => {
      try {
        await invoke("init_renderer");
        console.log("Renderer initialized successfully!");
      } catch (e) {
        console.error("Failed to initialize renderer:", e);
      }
    };

    init();
  }, []);

  return (
    <div className="flex flex-col gap-4 border-r  p-4 w-64">
      <h2 className="text-lg font-semibold">Extents</h2>
      <Button
        disableRipple
        color="secondary"
        variant="shadow"
        onPress={onPickFolder}
      >
        Pick Folder
      </Button>
      {/* This sidebar can be expanded with more controls later */}
    </div>
  );
}
