import { useEffect } from "react";

import { api } from "@/services/api";

export function useWGPURenderLoop() {
  useEffect(() => {
    let animationFrameId: number | null = null;
    let isActive = true;

    const loop = () => {
      if (!isActive) {
        return;
      }

      void api.renderer
        .shouldRenderFrame()
        .then((shouldRender) => {
          if (shouldRender) {
            return api.renderer.renderFrame();
          }

          return undefined;
        })
        .catch((error) => {
          console.error("WGPU render error:", error);
        })
        .finally(() => {
          animationFrameId = requestAnimationFrame(loop);
        });
    };

    const setPaused = () => {
      isActive = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      api.renderer.setRenderState("paused").catch((err) => {
        console.error("Failed to pause renderer:", err);
      });
    };

    const setIdle = () => {
      if (!isActive) {
        isActive = true;
        animationFrameId = requestAnimationFrame(loop);
      }

      api.renderer.setRenderState("idle").catch((err) => {
        console.error("Failed to resume renderer:", err);
      });
    };

    animationFrameId = requestAnimationFrame(loop);
    window.addEventListener("blur", setPaused);
    window.addEventListener("focus", setIdle);

    return () => {
      window.removeEventListener("blur", setPaused);
      window.removeEventListener("focus", setIdle);
      setPaused();
    };
  }, []);
}
