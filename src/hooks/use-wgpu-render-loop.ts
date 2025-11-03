import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useWGPURenderLoop() {
  useEffect(() => {
    let animationFrameId: number;

    const loop = async () => {
      try {
        const shouldRender = await invoke<boolean>("should_render_frame");

        if (shouldRender) {
          await invoke("render_frame");
        }
      } catch (error) {
        console.error("WGPU render error:", error);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    const setPaused = () => {
      invoke("set_render_state", { stateStr: "paused" }).catch((err) =>
        console.error("Failed to pause renderer:", err),
      );
    };

    const setIdle = () => {
      invoke("set_render_state", { stateStr: "idle" }).catch((err) =>
        console.error("Failed to resume renderer:", err),
      );
    };

    window.addEventListener("blur", setPaused);
    window.addEventListener("focus", setIdle);

    return () => {
      window.removeEventListener("blur", setPaused);
      window.removeEventListener("focus", setIdle);
    };
  }, []);
}
