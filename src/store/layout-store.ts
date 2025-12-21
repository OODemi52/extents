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

export type LayoutId = "editor" | "thumbnails";

export type EditPanelTab =
  | "basic"
  | "presets"
  | "detail"
  | "ai"
  | "crop"
  | "info";

interface LayoutState {
  activeLayout: LayoutId;
  panels: Record<PanelId, boolean>;

  activeEditTab: EditPanelTab;

  sidebarWidth: number;
  editPanelWidth: number;
  filmstripHeight: number;
  isSidebarResizing: boolean;

  togglePanel: (panelId: PanelId) => void;
  setActiveEditTab: (tab: EditPanelTab) => void;
  setSidebarWidth: (width: number) => void;
  setEditPanelWidth: (width: number) => void;
  setFilmstripHeight: (height: number) => void;
  setActiveLayout: (layout: LayoutId) => void;
  setSidebarResizing: (isResizing: boolean) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      activeLayout: "editor",
      panels: {
        sidebar: true,
        filmstrip: true,
        editPanel: true,
        infoPanel: false,
      },

      activeEditTab: "basic",

      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      editPanelWidth: EDIT_PANEL_DEFAULT_WIDTH,
      filmstripHeight: FILMSTRIP_DEFAULT_HEIGHT,
      isSidebarResizing: false,

      togglePanel: (panelId) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: !state.panels[panelId],
          },
        })),

      setActiveEditTab: (tab) => set({ activeEditTab: tab }),

      setSidebarWidth: (width) =>
        set({
          sidebarWidth: clamp(width, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH),
        }),

      setEditPanelWidth: (width) =>
        set({
          editPanelWidth: Math.max(EDIT_PANEL_DEFAULT_WIDTH, width),
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
      setSidebarResizing: (isResizing) =>
        set({ isSidebarResizing: isResizing }),
    }),
    {
      name: "extents-layout",
      partialize: (state) => ({
        activeLayout: state.activeLayout,
        panels: state.panels,
        activeEditTab: state.activeEditTab,
        sidebarWidth: state.sidebarWidth,
        editPanelWidth: state.editPanelWidth,
        filmstripHeight: state.filmstripHeight,
      }),
    },
  ),
);
