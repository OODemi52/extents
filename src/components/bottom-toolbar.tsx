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
  const { fileMetadataList, selectedIndex, selectedPaths, deselectAll } =
    useImageStore();

  const selectedFile =
    selectedIndex !== null ? fileMetadataList[selectedIndex] : null;
  const selectionCount = selectedPaths.size;
  const fallbackSelectedName =
    selectionCount === 1
      ? selectedPaths.values().next().value?.split("/").pop()
      : null;
  const selectionLabel =
    selectionCount > 1
      ? `${selectionCount} files selected`
      : (selectedFile?.fileName ?? fallbackSelectedName ?? "");
  const deselectLabel = `Deselect ${selectionCount} file${selectionCount === 1 ? "" : "s"}`;
  const isDetailLayout = activeLayout === "detail";

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
    if (key === "detail" || key === "thumbnails") {
      setActiveLayout(key);
    }
  };

  return (
    <footer
      className="
        relative
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
        <div className="flex items-center gap-2 pr-2">
          <ToolbarIconButton
            icon={<SidebarSimpleIcon size={16} />}
            isActive={panels.sidebar}
            tooltip="File Browser"
            onPress={() => togglePanel("sidebar")}
          />
          <Tabs
            aria-label="View selector"
            classNames={{
              tabList:
                "rounded-md bg-zinc-800/70 p-[1px] border border-zinc-700",
              tab: "h-6 w-6 p-0 text-zinc-300  data-[disabled=true]:text-zinc-500",
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
              key="detail"
              aria-label="Detail view"
              title={
                <Tooltip
                  className="border border-zinc-500"
                  closeDelay={0}
                  content="Detail"
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
        <div />

        <div className="flex items-center justify-end">
          {isDetailLayout ? (
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
            </div>
          ) : null}
          <ToolbarIconButton
            icon={<InfoIcon size={16} />}
            isActive={panels.infoPanel}
            tooltip="Info Panel"
            onPress={() => togglePanel("infoPanel")}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-zinc-500 tracking-tight">
        {fileMetadataList.length > 0 && selectionCount > 0 ? (
          <button
            className="group pointer-events-auto relative inline-flex items-center justify-center whitespace-nowrap"
            type="button"
            onClick={() => deselectAll()}
          >
            <span className="text-white/75 transition-none group-hover:opacity-0">
              {selectionLabel}
            </span>
            <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-red-400 opacity-0 transition-none group-hover:opacity-100">
              {deselectLabel}
            </span>
          </button>
        ) : null}
      </div>
    </footer>
  );
}
