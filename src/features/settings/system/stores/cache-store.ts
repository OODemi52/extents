import { create } from "zustand";

interface CacheStore {
  cacheSize: number | null;
  setCacheSize: (size: number) => void;
}

export const useCacheStore = create<CacheStore>((set) => ({
  cacheSize: null,
  setCacheSize: (size) => set({ cacheSize: size }),
}));
