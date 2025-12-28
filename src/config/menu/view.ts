import { CheckMenuItem, MenuItem, Submenu } from "@tauri-apps/api/menu";

import { separator } from "./standard";

import { useLayoutStore } from "@/store/layout-store";

const setExclusiveChecked = (
  items: CheckMenuItem[],
  activeId?: string | null,
) => {
  items.forEach((item) => {
    void item.setChecked(Boolean(activeId) && item.id === activeId);
  });
};

const previousView = await MenuItem.new({
  id: "view.previous",
  text: "Back",
  enabled: false,
  accelerator: "CmdOrCtrl+Left",
});

const nextView = await MenuItem.new({
  id: "view.next",
  text: "Forward",
  enabled: false,
  accelerator: "CmdOrCtrl+Right",
});

const allPhotos = await MenuItem.new({
  id: "view.allPhotos",
  text: "All Photos",
  enabled: false,
});

const fileBrowser = await CheckMenuItem.new({
  id: "view.fileBrowser",
  text: "Toggle File Browser",
  accelerator: "P",
});

const panelGroup: CheckMenuItem[] = [];
const viewModeGroup: CheckMenuItem[] = [];

const presets = await CheckMenuItem.new({
  id: "view.presets",
  text: "Presets",
  enabled: false,
  accelerator: "Shift+P",
  action: (id) => setExclusiveChecked(panelGroup, id),
});

const edit = await CheckMenuItem.new({
  id: "view.edit",
  text: "Edit",
  accelerator: "E",
  action: (id) => {
    const { activeLayout, panels, setActiveLayout, togglePanel } =
      useLayoutStore.getState();
    const isEditableView =
      activeLayout === "detail" || activeLayout === "compare";

    if (!isEditableView) {
      setActiveLayout("detail");
      setExclusiveChecked(viewModeGroup, "view.detail");
    }

    if (isEditableView && panels.editPanel) {
      togglePanel("editPanel");
      setExclusiveChecked(panelGroup, null);

      return;
    }

    if (!panels.editPanel) {
      togglePanel("editPanel");
    }

    setExclusiveChecked(panelGroup, id);
  },
});

const info = await CheckMenuItem.new({
  id: "view.info",
  text: "Info",
  accelerator: "I",
  action: (id) => setExclusiveChecked(panelGroup, id),
});

const keywords = await CheckMenuItem.new({
  id: "view.keywords",
  text: "Keywords",
  enabled: false,
  accelerator: "K",
  action: (id) => setExclusiveChecked(panelGroup, id),
});

const activity = await CheckMenuItem.new({
  id: "view.activity",
  text: "Activity",
  enabled: false,
  accelerator: "Y",
  action: (id) => setExclusiveChecked(panelGroup, id),
});

panelGroup.push(presets, edit, info, keywords, activity);

const versions = await MenuItem.new({
  id: "view.versions",
  text: "Versions",
  enabled: false,
  accelerator: "Shift+V",
});

const showFileNameInGrid = await CheckMenuItem.new({
  id: "view.showFileNameInGrid",
  text: "Show File Name in Grid",
});

const showFileExtensionInGrid = await CheckMenuItem.new({
  id: "view.showFileExtensionInGrid",
  text: "Show File Extension in Grid",
});

const editToolsCropRotateGeometry = await MenuItem.new({
  id: "view.editTools.cropRotateGeometry",
  text: "Crop / Rotate / Geometry",
  enabled: false,
  accelerator: "C",
});

const editToolsRemove = await MenuItem.new({
  id: "view.editTools.remove",
  text: "Remove",
  enabled: false,
  accelerator: "H",
});

const editToolsMasking = await MenuItem.new({
  id: "view.editTools.masking",
  text: "Masking",
  enabled: false,
  accelerator: "M",
});

const editToolsCreateNewMask = await Submenu.new({
  text: "Create New Mask*",
  items: [],
  enabled: false,
});

const editToolsAddToMaskUsing = await Submenu.new({
  text: "Add to Mask Using*",
  items: [],
  enabled: false,
});

const editToolsSubtractFromMaskUsing = await Submenu.new({
  text: "Subtract from Mask Using*",
  items: [],
  enabled: false,
});

const editToolsIntersectWithMaskUsing = await Submenu.new({
  text: "Intersect with Mask Using*",
  items: [],
  enabled: false,
});

const editToolsInvertSelectedMask = await MenuItem.new({
  id: "view.editTools.invertSelectedMask",
  text: "Invert Selected Mask",
  enabled: false,
  accelerator: "CmdOrCtrl+I",
});

const editToolsShowOverlayTool = await MenuItem.new({
  id: "view.editTools.showOverlay.tool",
  text: "Tool",
  enabled: false,
  accelerator: "CmdOrCtrl+O",
});

const editToolsShowOverlayMask = await MenuItem.new({
  id: "view.editTools.showOverlay.mask",
  text: "Mask",
  enabled: false,
  accelerator: "O",
});

const editToolsShowOverlayUnselectedMaskPin = await MenuItem.new({
  id: "view.editTools.showOverlay.unselectedMaskPin",
  text: "Show Unselected Mask Pin",
  enabled: false,
});

const editToolsShowOverlayCycleMaskColor = await MenuItem.new({
  id: "view.editTools.showOverlay.cycleMaskColor",
  text: "Cycle Mask Color",
  enabled: false,
  accelerator: "Shift+O",
});

const editToolsShowOverlayChooseCropOverlays = await MenuItem.new({
  id: "view.editTools.showOverlay.chooseCropOverlays",
  text: "Choose Crop Overlays",
  enabled: false,
});

const editToolsShowOverlay = await Submenu.new({
  text: "Show Overlay",
  items: [
    editToolsShowOverlayTool,
    editToolsShowOverlayMask,
    separator,
    editToolsShowOverlayUnselectedMaskPin,
    editToolsShowOverlayCycleMaskColor,
    editToolsShowOverlayChooseCropOverlays,
  ],
});

const editToolsVisualizeSpots = await MenuItem.new({
  id: "view.editTools.visualizeSpots",
  text: "Visualize Spots",
  enabled: false,
  accelerator: "A",
});

const editToolsShowClipping = await MenuItem.new({
  id: "view.editTools.showClipping",
  text: "Show Clipping",
  enabled: false,
  accelerator: "J",
});

const editToolsCycleRemoveType = await MenuItem.new({
  id: "view.editTools.cycleRemoveType",
  text: "Cycle Remove Type",
  enabled: false,
  accelerator: "Shift+T",
});

const editToolsWhiteBalance = await MenuItem.new({
  id: "view.editTools.whiteBalance",
  text: "White Balance",
  enabled: false,
  accelerator: "W",
});

const editToolsPointColor = await MenuItem.new({
  id: "view.editTools.pointColor",
  text: "Point Color",
  enabled: false,
  accelerator: "Shift+H",
});

const editToolsGuidedUpright = await MenuItem.new({
  id: "view.editTools.guidedUpright",
  text: "Guided Upright",
  enabled: false,
  accelerator: "Shift+G",
});

const editToolsTargetAdjustment = await Submenu.new({
  text: "Target Adjustment",
  items: [],
  enabled: false,
});

const editToolsSubmenu = await Submenu.new({
  text: "Edit Tools",
  items: [
    editToolsCropRotateGeometry,
    editToolsRemove,
    editToolsMasking,
    separator,
    editToolsCreateNewMask,
    editToolsAddToMaskUsing,
    editToolsSubtractFromMaskUsing,
    editToolsIntersectWithMaskUsing,
    separator,
    editToolsInvertSelectedMask,
    separator,
    editToolsShowOverlay,
    editToolsVisualizeSpots,
    editToolsShowClipping,
    editToolsCycleRemoveType,
    separator,
    editToolsWhiteBalance,
    editToolsPointColor,
    editToolsGuidedUpright,
    separator,
    editToolsTargetAdjustment,
  ],
});

const editPanelsHistogram = await CheckMenuItem.new({
  id: "view.editPanels.histogram",
  text: "Histogram",
  enabled: false,
  accelerator: "CmdOrCtrl+0",
});

const editPanelsLight = await CheckMenuItem.new({
  id: "view.editPanels.light",
  text: "Light",
  enabled: false,
  accelerator: "CmdOrCtrl+1",
});

const editPanelsColor = await CheckMenuItem.new({
  id: "view.editPanels.color",
  text: "Color",
  enabled: false,
  accelerator: "CmdOrCtrl+2",
});

const editPanelsEffects = await CheckMenuItem.new({
  id: "view.editPanels.effects",
  text: "Effects",
  enabled: false,
  accelerator: "CmdOrCtrl+3",
});

const editPanelsDetail = await CheckMenuItem.new({
  id: "view.editPanels.detail",
  text: "Detail",
  enabled: false,
  accelerator: "CmdOrCtrl+4",
});

const editPanelsOptics = await CheckMenuItem.new({
  id: "view.editPanels.optics",
  text: "Optics",
  enabled: false,
  accelerator: "CmdOrCtrl+5",
});

const editPanelsLensBlur = await CheckMenuItem.new({
  id: "view.editPanels.lensBlur",
  text: "Lens Blur",
  enabled: false,
  accelerator: "CmdOrCtrl+6",
});

const editPanelsGeometry = await CheckMenuItem.new({
  id: "view.editPanels.geometry",
  text: "Geometry",
  enabled: false,
  accelerator: "CmdOrCtrl+7",
});

const editPanelsProfile = await CheckMenuItem.new({
  id: "view.editPanels.profile",
  text: "Profile",
  enabled: false,
  accelerator: "Shift+B",
});

const editPanelsSinglePanelMode = await CheckMenuItem.new({
  id: "view.editPanels.singlePanelMode",
  text: "Single Panel Mode",
  enabled: false,
});

const editPanelsSubmenu = await Submenu.new({
  text: "Edit Panels",
  items: [
    editPanelsHistogram,
    separator,
    editPanelsLight,
    editPanelsColor,
    editPanelsEffects,
    editPanelsDetail,
    editPanelsOptics,
    editPanelsLensBlur,
    separator,
    editPanelsGeometry,
    separator,
    editPanelsProfile,
    separator,
    editPanelsSinglePanelMode,
  ],
});

const showOriginal = await MenuItem.new({
  id: "view.showOriginal",
  text: "Show Original",
  enabled: false,
  accelerator: "Backslash",
});

const compareBeforeAfter = await MenuItem.new({
  id: "view.compareBeforeAfter",
  text: "Compare Before and After",
  enabled: false,
});

const gridView = await CheckMenuItem.new({
  id: "view.grid",
  text: "Grid",
  accelerator: "G",
  action: (id) => {
    useLayoutStore.getState().setActiveLayout("thumbnails");
    setExclusiveChecked(viewModeGroup, id);
  },
});

const compareView = await CheckMenuItem.new({
  id: "view.compare",
  text: "Compare",
  enabled: false,
  accelerator: "Alt+C",
  action: (id) => {
    useLayoutStore.getState().setActiveLayout("compare");
    setExclusiveChecked(viewModeGroup, id);
  },
});

const detailView = await CheckMenuItem.new({
  id: "view.detail",
  text: "Detail",
  accelerator: "D",
  action: (id) => {
    useLayoutStore.getState().setActiveLayout("detail");
    setExclusiveChecked(viewModeGroup, id);
  },
});

const detailFullscreen = await CheckMenuItem.new({
  id: "view.detailFullscreen",
  text: "Detail - Full Screen",
  accelerator: "F",
  action: (id) => setExclusiveChecked(viewModeGroup, id),
});

viewModeGroup.push(gridView, compareView, detailView, detailFullscreen);

const secondaryWindowGrid = await MenuItem.new({
  id: "view.secondaryWindow.grid",
  text: "Grid",
  enabled: false,
  accelerator: "G",
});

const secondaryWindowDetail = await MenuItem.new({
  id: "view.secondaryWindow.detail",
  text: "Detail",
  enabled: false,
  accelerator: "D",
});

const secondaryWindowShowContextualTaskbar = await CheckMenuItem.new({
  id: "view.secondaryWindow.showContextualTaskbar",
  text: "Show Contextual Taskbar",
  enabled: false,
});

const secondaryWindowSubmenu = await Submenu.new({
  text: "Secondary Window",
  items: [
    secondaryWindowGrid,
    secondaryWindowDetail,
    separator,
    secondaryWindowShowContextualTaskbar,
  ],
});

const startSlideshow = await MenuItem.new({
  id: "view.startSlideshow",
  text: "Start Slideshow",
  enabled: false,
});

const filmstrip = await CheckMenuItem.new({
  id: "view.filmstrip",
  text: "Filmstrip",
  enabled: false,
  accelerator: "Slash",
});

const zoomIn = await MenuItem.new({
  id: "view.zoomIn",
  text: "Zoom In",
  enabled: false,
  accelerator: "CmdOrCtrl+=",
});

const zoomOut = await MenuItem.new({
  id: "view.zoomOut",
  text: "Zoom Out",
  enabled: false,
  accelerator: "CmdOrCtrl+-",
});

const toggleZoom = await MenuItem.new({
  id: "view.toggleZoom",
  text: "Toggle Zoom",
  enabled: false,
  accelerator: "Space",
});

export const viewSubmenu = await Submenu.new({
  text: "View",
  items: [
    previousView,
    nextView,
    separator,
    allPhotos,
    separator,
    fileBrowser,
    separator,
    presets,
    edit,
    info,
    keywords,
    activity,
    versions,
    separator,
    showFileNameInGrid,
    showFileExtensionInGrid,
    separator,
    editToolsSubmenu,
    editPanelsSubmenu,
    separator,
    showOriginal,
    compareBeforeAfter,
    separator,
    gridView,
    compareView,
    detailView,
    detailFullscreen,
    separator,
    secondaryWindowSubmenu,
    separator,
    startSlideshow,
    separator,
    filmstrip,
    separator,
    zoomIn,
    zoomOut,
    toggleZoom,
    separator,
  ],
});
