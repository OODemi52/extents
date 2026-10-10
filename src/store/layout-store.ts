import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SIDEBAR_DEFAULT_WIDTH = 280;
export const SIDEBAR_MIN_WIDTH = 100;
export const SIDEBAR_MAX_WIDTH = 400;

export const EDIT_PANEL_DEFAULT_WIDTH = 300;

export const MAIN_MIN_WIDTH = 300;
export const FILMSTRIP_GAP = 8;
export const FILMSTRIP_MIN_ITEM_SIZE = 56;
export const FILMSTRIP_MAX_ITEM_SIZE = 180;
export const FILMSTRIP_DEFAULT_HEIGHT = 180;
export const FILMSTRIP_MIN_HEIGHT = FILMSTRIP_MIN_ITEM_SIZE + FILMSTRIP_GAP * 2;
export const FILMSTRIP_MAX_HEIGHT = FILMSTRIP_MAX_ITEM_SIZE + FILMSTRIP_GAP * 2;

export type PanelId = "sidebar" | "filmstrip" | "editPanel" | "infoPanel";

export type LayoutId = "detail" | "grid" | "compare" | "inspector";

export type EditPanelTab =
  | "basic"
  | "presets"
  | "detail"
  | "ai"
  | "crop"
  | "info";

const normalizeLayoutId = (value: unknown): LayoutId => {
  if (value === "thumbnails") {
    return "grid";
  }

  if (value === "grid" || value === "compare" || value === "inspector") {
    return value;
  }

  return "detail";
};

interface LayoutState {
  activeLayout: LayoutId;
  panels: Record<PanelId, boolean>;
  sidePanelsHidden: boolean;

  // Inspector is gated behind an explicit opt-in even though it is represented
  // as a layout mode once enabled.
  inspectorEnabled: boolean;

  activeEditTab: EditPanelTab;

  sidebarWidth: number;
  filmstripHeight: number;

  togglePanel: (panelId: PanelId) => void;
  toggleSidePanels: () => void;
  setPanelVisible: (panelId: PanelId, visible: boolean) => void;
  setActiveEditTab: (tab: EditPanelTab) => void;
  setSidebarWidth: (width: number) => void;
  setFilmstripHeight: (height: number) => void;
  setActiveLayout: (layout: LayoutId) => void;
  setInspectorEnabled: (enabled: boolean) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const updatePanelVisibility = (
  panels: Record<PanelId, boolean>,
  panelId: PanelId,
  visible: boolean,
) => {
  const nextPanels = {
    ...panels,
    [panelId]: visible,
  };

  // Info temporarily takes over the shared right rail without discarding the
  // edit panel's open state. Explicitly opening Edit switches back to it.
  if (panelId === "editPanel" && visible) {
    nextPanels.infoPanel = false;
  }

  return nextPanels;
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      activeLayout: "detail",
      inspectorEnabled: false,
      panels: {
        sidebar: true,
        filmstrip: true,
        editPanel: true,
        infoPanel: false,
      },
      sidePanelsHidden: false,

      activeEditTab: "basic",

      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      filmstripHeight: FILMSTRIP_DEFAULT_HEIGHT,

      togglePanel: (panelId) =>
        set((state) => {
          const isSidePanel = panelId !== "filmstrip";

          if (isSidePanel && state.sidePanelsHidden) {
            return {
              sidePanelsHidden: false,
              panels: updatePanelVisibility(state.panels, panelId, true),
            };
          }

          return {
            panels: updatePanelVisibility(
              state.panels,
              panelId,
              !state.panels[panelId],
            ),
          };
        }),
      toggleSidePanels: () =>
        set((state) => ({ sidePanelsHidden: !state.sidePanelsHidden })),
      setPanelVisible: (panelId, visible) => {
        const { panels, sidePanelsHidden } = get();
        const isSwitchingFromInfoToEdit =
          panelId === "editPanel" && visible && panels.infoPanel;
        const shouldRevealSidePanels =
          panelId !== "filmstrip" && visible && sidePanelsHidden;

        if (
          panels[panelId] === visible &&
          !isSwitchingFromInfoToEdit &&
          !shouldRevealSidePanels
        ) {
          return;
        }

        set((state) => ({
          sidePanelsHidden: shouldRevealSidePanels
            ? false
            : state.sidePanelsHidden,
          panels: updatePanelVisibility(state.panels, panelId, visible),
        }));
      },

      setActiveEditTab: (tab) => set({ activeEditTab: tab }),

      setSidebarWidth: (width) =>
        set({
          sidebarWidth: clamp(width, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH),
        }),

      setFilmstripHeight: (height) =>
        set({
          filmstripHeight: clamp(
            height,
            FILMSTRIP_MIN_HEIGHT,
            FILMSTRIP_MAX_HEIGHT,
          ),
        }),
      setActiveLayout: (layout) => set({ activeLayout: layout }),
      setInspectorEnabled: (enabled) => set({ inspectorEnabled: enabled }),
    }),
    {
      name: "extents-layout",
      version: 6,
      migrate: (state) => {
        if (!state || typeof state !== "object") return state;
        const persisted = state as Partial<LayoutState>;
        const infoPanel = persisted.panels?.infoPanel ?? false;

        return {
          activeLayout: normalizeLayoutId(persisted.activeLayout),
          inspectorEnabled: persisted.inspectorEnabled ?? false,
          panels: {
            sidebar: persisted.panels?.sidebar ?? true,
            filmstrip: persisted.panels?.filmstrip ?? true,
            editPanel: persisted.panels?.editPanel ?? true,
            infoPanel,
          },
          activeEditTab: persisted.activeEditTab ?? "basic",
          sidebarWidth: clamp(
            persisted.sidebarWidth ?? SIDEBAR_DEFAULT_WIDTH,
            SIDEBAR_MIN_WIDTH,
            SIDEBAR_MAX_WIDTH,
          ),
          filmstripHeight: clamp(
            persisted.filmstripHeight ?? FILMSTRIP_DEFAULT_HEIGHT,
            FILMSTRIP_MIN_HEIGHT,
            FILMSTRIP_MAX_HEIGHT,
          ),
        };
      },
      partialize: (state) => ({
        activeLayout: state.activeLayout,
        inspectorEnabled: state.inspectorEnabled,
        panels: state.panels,
        activeEditTab: state.activeEditTab,
        sidebarWidth: state.sidebarWidth,
        filmstripHeight: state.filmstripHeight,
      }),
    },
  ),
);
