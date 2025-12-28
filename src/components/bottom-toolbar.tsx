import {
  SidebarSimpleIcon,
  InfoIcon,
  SlidersIcon,
  CropIcon,
  EraserIcon,
  SwatchesIcon,
  SparkleIcon,
  ImageSquareIcon,
  SquaresFourIcon,
  ColumnsIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Tab, Tabs } from "@heroui/tabs";
import { Tooltip } from "@heroui/tooltip";

import { ToolbarIconButton } from "./ui/buttons/toolbar-icon-button";

import {
  EDIT_PANEL_DEFAULT_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  useLayoutStore,
} from "@/store/layout-store";
import { useImageStore } from "@/store/image-store";

export function BottomToolbar() {
  const {
    panels,
    activeLayout,
    activeEditTab,
    togglePanel,
    setActiveLayout,
    setActiveEditTab,
  } = useLayoutStore();
  const { fileMetadataList, selectedIndex } = useImageStore();

  const selectedFile =
    selectedIndex !== null ? fileMetadataList[selectedIndex] : null;
  const isEditorLayout = activeLayout === "editor";

  const path = selectedFile?.path ?? "";
  const parts = path.split("/");

  const currentFolderName = parts[parts.length - 2];

  const sidebarColumnWidth = `${SIDEBAR_DEFAULT_WIDTH}px`;
  const editColumnWidth = `${EDIT_PANEL_DEFAULT_WIDTH}px`;

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

  const handleLayoutChange = (key: string | number) => {
    if (key === "editor" || key === "thumbnails") {
      setActiveLayout(key);
    }
  };

  return (
    <footer
      className="
        h-8 px-2 mb-2
        text-[11px] text-zinc-400
        select-none
        rounded-xl
      "
    >
      <div
        className="grid h-full items-center"
        style={{
          gridTemplateColumns: `${sidebarColumnWidth} 1fr ${editColumnWidth}`,
        }}
      >
        <div className="flex items-center gap-1 pr-2">
          <ToolbarIconButton
            icon={<SidebarSimpleIcon size={16} />}
            isActive={panels.sidebar}
            tooltip="File Browser"
            onPress={() => togglePanel("sidebar")}
          />
          {fileMetadataList.length > 0 ? (
            <div className="ml-1">
              {currentFolderName} — {fileMetadataList.length} images
            </div>
          ) : (
            ""
          )}
        </div>

        <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center justify-start">
            <Tabs
              aria-label="View selector"
              classNames={{
                tabList:
                  "rounded-md bg-zinc-800/70 p-[1px] border border-zinc-700",
                tab: "h-6 w-6 p-0 text-zinc-300 data-[selected=true]:text-blue-500 data-[disabled=true]:text-zinc-500",
                cursor: "rounded-sm bg-blue-500/20",
                tabContent: "group-data-[selected=true]:text-blue-500",
              }}
              selectedKey={activeLayout}
              size="sm"
              variant="solid"
              onSelectionChange={handleLayoutChange}
            >
              <Tab
                key="thumbnails"
                aria-label="Grid view"
                title={
                  <Tooltip
                    className="border border-zinc-500"
                    closeDelay={0}
                    content="Grid"
                    delay={500}
                    offset={8}
                    radius="sm"
                    size="sm"
                  >
                    <div className="flex items-center justify-center">
                      <SquaresFourIcon size={16} />
                    </div>
                  </Tooltip>
                }
              />
              <Tab
                key="editor"
                aria-label="Edit view"
                title={
                  <Tooltip
                    className="border border-zinc-500"
                    closeDelay={0}
                    content="Edit"
                    delay={500}
                    offset={8}
                    radius="sm"
                    size="sm"
                  >
                    <div className="flex items-center justify-center">
                      <ImageSquareIcon size={16} />
                    </div>
                  </Tooltip>
                }
              />
              <Tab
                key="compare"
                isDisabled
                aria-label="Compare view"
                title={
                  <Tooltip
                    className="border border-zinc-500"
                    closeDelay={0}
                    content="Compare"
                    delay={500}
                    offset={8}
                    radius="sm"
                    size="sm"
                  >
                    <div className="flex items-center justify-center [transform:scaleX(1.2)]">
                      <ColumnsIcon size={16} />
                    </div>
                  </Tooltip>
                }
              />
            </Tabs>
          </div>

          <div className="min-w-0 justify-self-center text-zinc-500 tracking-tight">
            {fileMetadataList.length > 0 ? (
              <>
                {selectedFile && (
                  <>
                    <span className="text-white/75">
                      {selectedFile.fileName}
                    </span>
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

          <div />
        </div>

        <div className="flex items-center justify-end">
          {isEditorLayout ? (
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
          ) : null}
        </div>
      </div>
    </footer>
  );
}
