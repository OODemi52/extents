import type { CommandArgs } from "@/types/commands";

import { invokeTauri } from "./_client";

export type RenderState = CommandArgs["set_render_state"]["stateStr"];

export const initRenderer = () => invokeTauri("init_renderer", null);

export const setRenderState = (args: CommandArgs["set_render_state"]) =>
  invokeTauri("set_render_state", args);

export const syncViewport = (args: CommandArgs["update_viewport"]) =>
  invokeTauri("update_viewport", args);

export const loadImage = (args: CommandArgs["load_image"]) =>
  invokeTauri("load_image", args);

export const startFullImageLoad = (
  args: CommandArgs["start_full_image_load"],
) => invokeTauri("start_full_image_load", args);

export const swapRequestedTexture = (
  args: CommandArgs["swap_requested_texture"],
) => invokeTauri("swap_requested_texture", args);

export const updateTransform = (args: CommandArgs["update_transform"]) =>
  invokeTauri("update_transform", args);

export const resizeSurface = (args: CommandArgs["resize_surface"]) =>
  invokeTauri("resize_surface", args);

export const prefetch = (args: CommandArgs["prefetch_thumbnails"]) =>
  invokeTauri("prefetch_thumbnails", args);

export const renderFrame = () => invokeTauri("render_frame", null);

export const shouldRenderFrame = () => invokeTauri("should_render_frame", null);

export const clearRenderer = () => invokeTauri("clear_renderer", null);
