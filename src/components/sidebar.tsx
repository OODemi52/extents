import { useEffect } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpenIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { Divider } from "@heroui/divider";
import { Tooltip } from "@heroui/tooltip";

import { FileTree } from "@/features/file-explorer/components/file-tree";

type SidebarProps = {
  onPickFolder: () => void;
  hasImages: boolean;
};

export function Sidebar({ onPickFolder, hasImages }: SidebarProps) {
  // Get the React Query client instance
  const queryClient = useQueryClient();

  // This effect initializes the renderer once on startup.
  useEffect(() => {
    invoke("init_renderer").catch(console.error);
  }, []);

  const handlePickFolder = async () => {
    // Call the original function which opens the dialog
    await onPickFolder();
    // After a new folder is picked, invalidate the 'fileTree' query.
    // This tells React Query to refetch the data from the backend.
    await queryClient.invalidateQueries({ queryKey: ["fileTree"] });
  };

  return (
    <aside className="bg-zinc-900/99 border border-white/15 rounded-xl flex flex-col min-w-68 w-68 my-2 ml-2 py-2 gap-y-3">
      {/* Header Controls */}

      <div className="flex flex-row gap-3 p-4">
        {/*make maginfying glass disapper once there is text */}
        <Tooltip content="🚧Coming Soon!🚧">
          <Input
            isDisabled
            placeholder="    Search folders..."
            radius="sm"
            startContent={
              <MagnifyingGlassIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                size={16}
                weight="bold"
              />
            }
          />
        </Tooltip>

        <Tooltip
          className="border border-zinc-500"
          closeDelay={0}
          content="Open Folder..."
          delay={1000}
          size="sm"
        >
          <Button
            disableRipple
            isIconOnly
            className="bg-transparent"
            color="secondary"
            onPress={handlePickFolder}
          >
            {/*Com back to this to make custom folder search icon */}
            <FolderOpenIcon size={18} weight="fill" />
          </Button>
        </Tooltip>
      </div>

      <Divider className="w-11/12 mx-auto" />

      {/* Folder Tree (scrollable) */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* Replace the old mock data map with our new feature component */}
        <FileTree />
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-300 dark:border-neutral-700 p-4 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex justify-between">
          <span>Storage</span>
          <span>45.2 GB / 100 GB</span>
        </div>
      </div>
    </aside>
  );
}
