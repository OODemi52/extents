import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { useSettingsStore } from "@/features/settings/store/settings-store";

export function useCacheWatcher() {
  const setCacheSize = useSettingsStore((state) => state.setCacheSize);

  useEffect(() => {
    const unlisten = listen<number>("cache-size-updated", (event) => {
      setCacheSize(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setCacheSize]);
}
