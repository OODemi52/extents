import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelId = "sidebar" | "filmstrip" | "editPanel" | "infoPanel";

export type EditPanelTab =
  | "basic"
  | "color"
  | "detail"
  | "effects"
  | "crop"
  | "info";

interface LayoutState {
  panels: Record<PanelId, boolean>;

  activeEditTab: EditPanelTab;

  sidebarWidth: number;
  editPanelWidth: number;
  filmstripHeight: number;

  togglePanel: (panelId: PanelId) => void;
  setActiveEditTab: (tab: EditPanelTab) => void;
  setSidebarWidth: (width: number) => void;
  setEditPanelWidth: (width: number) => void;
  setFilmstripHeight: (height: number) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      panels: {
        sidebar: true,
        filmstrip: true,
        editPanel: true,
        infoPanel: false,
      },

      activeEditTab: "basic",

      sidebarWidth: 15,
      editPanelWidth: 20,
      filmstripHeight: 15,

      togglePanel: (panelId) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [panelId]: !state.panels[panelId],
          },
        })),

      setActiveEditTab: (tab) => set({ activeEditTab: tab }),

      setSidebarWidth: (width) => set({ sidebarWidth: width }),

      setEditPanelWidth: (width) => set({ editPanelWidth: width }),

      setFilmstripHeight: (height) => set({ filmstripHeight: height }),
    }),
    {
      name: "extents-layout",
    },
  ),
);
