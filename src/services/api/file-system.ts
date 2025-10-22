import { invokeTauri } from "./_client";

export const buildFileTree = () => {
  return invokeTauri("build_fs_tree", { scanLevel: 2 });
};
