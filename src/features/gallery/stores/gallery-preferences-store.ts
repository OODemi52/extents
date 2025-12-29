import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GalleryPreferencesState {
  showFileNameInGrid: boolean;
  showFileExtensionInGrid: boolean;
  setShowFileNameInGrid: (value: boolean) => void;
  setShowFileExtensionInGrid: (value: boolean) => void;
  toggleShowFileNameInGrid: () => void;
  toggleShowFileExtensionInGrid: () => void;
}

export const useGalleryPreferencesStore = create<GalleryPreferencesState>()(
  persist(
    (set) => ({
      showFileNameInGrid: true,
      showFileExtensionInGrid: true,
      setShowFileNameInGrid: (value) => set({ showFileNameInGrid: value }),
      setShowFileExtensionInGrid: (value) =>
        set({ showFileExtensionInGrid: value }),
      toggleShowFileNameInGrid: () =>
        set((state) => ({
          showFileNameInGrid: !state.showFileNameInGrid,
        })),
      toggleShowFileExtensionInGrid: () =>
        set((state) => ({
          showFileExtensionInGrid: !state.showFileExtensionInGrid,
        })),
    }),
    {
      name: "extents-gallery-preferences",
      version: 1,
      partialize: (state) => ({
        showFileNameInGrid: state.showFileNameInGrid,
        showFileExtensionInGrid: state.showFileExtensionInGrid,
      }),
    },
  ),
);
