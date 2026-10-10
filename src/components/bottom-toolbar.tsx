import { memo } from "react";
import {
  SidebarSimpleIcon,
  InfoIcon,
  FilmStripIcon,
  SlidersIcon,
  CropIcon,
  EraserIcon,
  SwatchesIcon,
  SparkleIcon,
  ImageSquareIcon,
  SquaresFourIcon,
  MagnifyingGlassIcon,
  ImagesIcon,
  ListMagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Tabs } from "@heroui/react";

import { EditorTooltip } from "./ui/editor-tooltip";
import { ToolbarIconButton } from "./ui/buttons/toolbar-icon-button";

import { useLayoutStore } from "@/store/layout-store";
import { useImageStore } from "@/store/image-store";
import { useInspectionWorkspaceStore } from "@/features/inspector/store/inspection-workspace-store";

export const BottomToolbar = memo(function BottomToolbar() {
  const panels = useLayoutStore((state) => state.panels);
  const sidePanelsHidden = useLayoutStore((state) => state.sidePanelsHidden);
  const activeLayout = useLayoutStore((state) => state.activeLayout);
  const activeEditTab = useLayoutStore((state) => state.activeEditTab);
  const inspectorEnabled = useLayoutStore((state) => state.inspectorEnabled);
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  const setPanelVisible = useLayoutStore((state) => state.setPanelVisible);
  const setActiveLayout = useLayoutStore((state) => state.setActiveLayout);
  const setActiveEditTab = useLayoutStore((state) => state.setActiveEditTab);
  const inspectorPanelMode = useInspectionWorkspaceStore(
    (state) => state.inspectorPanelMode,
  );
  const setInspectorPanelMode = useInspectionWorkspaceStore(
    (state) => state.setInspectorPanelMode,
  );
  const hasFiles = useImageStore((state) => state.files.length > 0);
  const selectedFileName = useImageStore((state) =>
    state.selectedIndex !== null
      ? (state.files[state.selectedIndex]?.fileName ?? null)
      : null,
  );
  const selectedPaths = useImageStore((state) => state.selectedPaths);
  const deselectAll = useImageStore((state) => state.deselectAll);
  const selectionCount = selectedPaths.size;
  const fallbackSelectedName =
    selectionCount === 1
      ? selectedPaths.values().next().value?.split("/").pop()
      : null;
  const selectionLabel =
    selectionCount > 1
      ? `${selectionCount} files selected`
      : (selectedFileName ?? fallbackSelectedName ?? "");
  const deselectLabel = `Deselect ${selectionCount} file${selectionCount === 1 ? "" : "s"}`;
  const isDetailLayout = activeLayout === "detail";
  const isInspectorLayout = activeLayout === "inspector";
  const isEditPanelVisible =
    panels.editPanel && !panels.infoPanel && !sidePanelsHidden;

  const toggleToTab = (tab: typeof activeEditTab) => {
    if (activeEditTab === tab && isEditPanelVisible) {
      setPanelVisible("editPanel", false);

      return;
    }

    setActiveEditTab(tab);
    setPanelVisible("editPanel", true);
  };

  const handleLayoutChange = (key: string | number) => {
    if (
      key === "detail" ||
      key === "grid" ||
      (key === "inspector" && inspectorEnabled)
    ) {
      setActiveLayout(key);
    }
  };

  return (
    <footer className="mb-2 h-8 select-none px-2 text-[11px] text-zinc-400">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,240px)_minmax(0,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ToolbarIconButton
            className="editor-control-surface rounded-full"
            icon={<SidebarSimpleIcon size={16} />}
            isActive={panels.sidebar && !sidePanelsHidden}
            tooltip="File Browser"
            onPress={() => togglePanel("sidebar")}
          />
          <Tabs
            aria-label="View selector"
            className="workspace-view-tabs"
            selectedKey={activeLayout}
            variant="secondary"
            onSelectionChange={handleLayoutChange}
          >
            <Tabs.ListContainer className="editor-control-surface rounded-[16px] p-0.5">
              <Tabs.List className="gap-0 bg-transparent p-0">
                <Tabs.Tab
                  aria-label="Grid view"
                  className="workspace-view-tab"
                  id="grid"
                >
                  <EditorTooltip content="Grid" delay={500} offset={8}>
                    <span className="flex items-center justify-center">
                      <SquaresFourIcon size={14} />
                    </span>
                  </EditorTooltip>
                </Tabs.Tab>
                <Tabs.Tab
                  aria-label="Detail view"
                  className="workspace-view-tab"
                  id="detail"
                >
                  <EditorTooltip content="Detail" delay={500} offset={8}>
                    <span className="flex items-center justify-center">
                      <ImageSquareIcon size={14} />
                    </span>
                  </EditorTooltip>
                </Tabs.Tab>
                {inspectorEnabled ? (
                  <Tabs.Tab
                    aria-label="Inspector view"
                    className="workspace-view-tab"
                    id="inspector"
                  >
                    <EditorTooltip content="Inspector" delay={500} offset={8}>
                      <span className="flex items-center justify-center">
                        <MagnifyingGlassIcon size={14} />
                      </span>
                    </EditorTooltip>
                  </Tabs.Tab>
                ) : null}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
          {(isDetailLayout || isInspectorLayout) && hasFiles ? (
            <ToolbarIconButton
              className="editor-control-surface rounded-full"
              icon={<FilmStripIcon size={16} />}
              isActive={panels.filmstrip}
              tooltip="Filmstrip"
              onPress={() => togglePanel("filmstrip")}
            />
          ) : null}
        </div>

        <div className="flex min-w-0 items-center justify-center">
          {hasFiles && selectionCount > 0 ? (
            <div className="editor-control-surface flex h-7 min-w-0 max-w-full items-center gap-1 rounded-[16px] pl-2">
              <span
                className="min-w-0 truncate text-zinc-300"
                title={selectionLabel}
              >
                {selectionLabel}
              </span>
              <ToolbarIconButton
                className="h-6 w-6 min-w-6"
                icon={<XIcon size={12} />}
                tooltip={deselectLabel}
                onPress={deselectAll}
              />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end">
          {isDetailLayout ? (
            <div className="editor-control-surface flex items-center rounded-[16px] p-0.5">
              <ToolbarIconButton
                isDisabled
                className="h-6 w-6 min-w-6"
                icon={<SparkleIcon size={16} />}
                tooltip="AI tools unavailable"
                onPress={() => toggleToTab("ai")}
              />

              <ToolbarIconButton
                isDisabled
                className="h-6 w-6 min-w-6"
                icon={<SwatchesIcon size={16} />}
                tooltip="Presets unavailable"
                onPress={() => toggleToTab("presets")}
              />

              <ToolbarIconButton
                className="h-6 w-6 min-w-6"
                icon={<SlidersIcon className="rotate-90" size={16} />}
                isActive={activeEditTab === "basic" && isEditPanelVisible}
                tooltip="Basic Adjustments"
                onPress={() => toggleToTab("basic")}
              />

              <ToolbarIconButton
                isDisabled
                className="h-6 w-6 min-w-6"
                icon={<CropIcon size={16} />}
                tooltip="Crop tools unavailable"
                onPress={() => toggleToTab("crop")}
              />

              <ToolbarIconButton
                isDisabled
                className="h-6 w-6 min-w-6"
                icon={<EraserIcon size={16} />}
                tooltip="Detail and retouch tools unavailable"
                onPress={() => toggleToTab("detail")}
              />
            </div>
          ) : null}
          {isInspectorLayout ? (
            <div className="editor-control-surface flex items-center rounded-[16px] p-0.5">
              <ToolbarIconButton
                className="h-6 w-6 min-w-6"
                icon={<ListMagnifyingGlassIcon size={16} />}
                isActive={inspectorPanelMode === "inspect"}
                tooltip="Inspect"
                onPress={() => setInspectorPanelMode("inspect")}
              />

              <ToolbarIconButton
                className="h-6 w-6 min-w-6"
                icon={<ImagesIcon size={16} />}
                isActive={inspectorPanelMode === "checkpoints"}
                tooltip="Checkpoints"
                onPress={() => setInspectorPanelMode("checkpoints")}
              />
            </div>
          ) : null}
          {activeLayout !== "inspector" ? (
            <ToolbarIconButton
              className="editor-control-surface ml-1 rounded-full"
              icon={<InfoIcon size={16} />}
              isActive={panels.infoPanel && !sidePanelsHidden}
              tooltip="Info Panel"
              onPress={() => togglePanel("infoPanel")}
            />
          ) : null}
        </div>
      </div>
    </footer>
  );
});
