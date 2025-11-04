import {
  SidebarSimpleIcon,
  InfoIcon,
  SlidersIcon,
  CropIcon,
  EraserIcon,
  SwatchesIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";

import { ToolbarIconButton } from "./ui/buttons/toolbar-icon-button";

import { useLayoutStore } from "@/store/layout-store";
import { useImageStore } from "@/store/image-store";

export function BottomToolbar() {
  const { panels, activeEditTab, togglePanel, setActiveEditTab } =
    useLayoutStore();
  const { fileMetadataList, selectedIndex } = useImageStore();

  const selectedFile =
    selectedIndex !== null ? fileMetadataList[selectedIndex] : null;

  const path = selectedFile?.path ?? "";
  const parts = path.split("/");
  const currentFolderName = parts[parts.length - 2];

  const toggleToTab = (tab: typeof activeEditTab) => {
    if (activeEditTab === tab && panels.editPanel) {
      togglePanel("editPanel");
    } else {
      setActiveEditTab(tab);
      if (!panels.editPanel) {
        togglePanel("editPanel");
      }
    }
  };

  return (
    <footer
      className="
        flex items-center justify-between
        h-8 px-2 mb-2
        text-[11px] text-zinc-400
        select-none
        rounded-xl
      "
    >
      <div className="flex items-center ">
        <ToolbarIconButton
          icon={<SidebarSimpleIcon size={16} />}
          isActive={panels.sidebar}
          tooltip="File Browser"
          onPress={() => togglePanel("sidebar")}
        />
        {fileMetadataList.length > 0 ? (
          <>
            {currentFolderName}
            {" — "}
            {fileMetadataList.length} images
          </>
        ) : (
          ""
        )}
      </div>

      <div className="text-zinc-500 tracking-tight">
        {fileMetadataList.length > 0 ? (
          <>
            {selectedFile && (
              <>
                <span className="text-white/75">{selectedFile.fileName}</span>
                {selectedFile.width && selectedFile.height && (
                  <>
                    {" — "}
                    {selectedFile.width}
                    {" x "}
                    {selectedFile.height}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          ""
        )}
      </div>

      <div className="flex items-center">
        <ToolbarIconButton
          icon={<SparkleIcon size={16} />}
          isActive={activeEditTab === "ai" && panels.editPanel}
          tooltip="AI"
          onPress={() => toggleToTab("ai")}
        />

        <ToolbarIconButton
          icon={<SwatchesIcon size={16} />}
          isActive={activeEditTab === "presets" && panels.editPanel}
          tooltip="Presets"
          onPress={() => toggleToTab("presets")}
        />

        <ToolbarIconButton
          icon={<SlidersIcon className="rotate-90" size={16} />}
          isActive={activeEditTab === "basic" && panels.editPanel}
          tooltip="Basic Adjustments"
          onPress={() => toggleToTab("basic")}
        />

        <ToolbarIconButton
          icon={<CropIcon size={16} />}
          isActive={activeEditTab === "crop" && panels.editPanel}
          tooltip="Crop"
          onPress={() => toggleToTab("crop")}
        />

        <ToolbarIconButton
          icon={<EraserIcon size={16} />}
          isActive={activeEditTab === "detail" && panels.editPanel}
          tooltip="Detail / Retouch"
          onPress={() => toggleToTab("detail")}
        />

        <ToolbarIconButton
          icon={<InfoIcon size={16} />}
          isActive={panels.infoPanel}
          tooltip="Info Panel"
          onPress={() => togglePanel("infoPanel")}
        />
      </div>
    </footer>
  );
}
