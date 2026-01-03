import type { CommandArgs } from "@/types/commands";

import { invokeTauri } from "./_client";

export type RenderState = CommandArgs["set_render_state"]["stateStr"];

export const initRenderer = () => invokeTauri("init_renderer", null);

export const setRenderState = (state: RenderState) =>
  invokeTauri("set_render_state", { stateStr: state });

export const syncViewport = (viewport: CommandArgs["update_viewport"]) =>
  invokeTauri("update_viewport", viewport);

export const loadImage = (payload: CommandArgs["load_image"]) =>
  invokeTauri("load_image", payload);

export const swapRequestedTexture = (
  payload: CommandArgs["swap_requested_texture"],
) => invokeTauri("swap_requested_texture", payload);

export const updateTransform = (payload: CommandArgs["update_transform"]) =>
  invokeTauri("update_transform", payload);

export const resizeSurface = (payload: CommandArgs["resize_surface"]) =>
  invokeTauri("resize_surface", payload);

export const renderFrame = () => invokeTauri("render_frame", null);

export const shouldRenderFrame = () => invokeTauri("should_render_frame", null);

export const prefetch = (paths: string[]): Promise<void> => {
  return invokeTauri("prefetch_thumbnails", { paths });
};

export const clearRenderer = () => invokeTauri("clear_renderer", null);
