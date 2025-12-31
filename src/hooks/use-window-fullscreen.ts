import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useWindowFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const window = getCurrentWindow();

    const syncFullscreen = async () => {
      try {
        const fullscreenStatus = await window.isFullscreen();

        if (isMounted) {
          setIsFullscreen(fullscreenStatus);
        }
      } catch (error) {
        console.error("[window] failed to read fullscreen state", error);
      }
    };

    void syncFullscreen();

    let unlistenResize: (() => void) | null = null;
    let unlistenFocus: (() => void) | null = null;

    void (async () => {
      try {
        unlistenResize = await window.onResized(() => {
          void syncFullscreen();
        });
        unlistenFocus = await window.onFocusChanged(() => {
          void syncFullscreen();
        });
      } catch (error) {
        console.error("[window] failed to listen for window changes", error);
      }
    })();

    const handleVisibilityChange = () => {
      void syncFullscreen();
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isMounted = false;
      unlistenResize?.();
      unlistenFocus?.();
      if (typeof document !== "undefined") {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      }
    };
  }, []);

  return isFullscreen;
}
