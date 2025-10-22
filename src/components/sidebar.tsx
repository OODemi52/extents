import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpenIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip } from "@heroui/tooltip";
import { Tab, Tabs } from "@heroui/tabs";

import { FileTree } from "@/features/file-browser/components/file-tree";

type SidebarProps = {
  onPickFolder: () => void;
  hasImages: boolean;
};

export function Sidebar({ onPickFolder, hasImages }: SidebarProps) {
  const [selectedTab, setSelectedTab] = useState("browse");

  const queryClient = useQueryClient();

  useEffect(() => {
    invoke("init_renderer").catch(console.error);
  }, []);

  const handlePickFolder = async () => {
    onPickFolder();
    await queryClient.invalidateQueries({ queryKey: ["fileTree"] });
  };

  return (
    <aside className="bg-zinc-900/99 border border-white/15 rounded-xl flex flex-col min-w-68 w-68 my-2 ml-2 py-2 gap-y-1">
      {/* Header Controls */}

      <div className="flex flex-row gap-3 py-2 px-4">
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
            hidden={selectedTab !== "browse"}
            onPress={handlePickFolder}
          >
            {/*Come back to this to make custom folder search icon */}
            <FolderOpenIcon size={18} weight="fill" />
          </Button>
        </Tooltip>
      </div>

      <Tabs
        aria-label="File Tabs"
        className="flex flex-col"
        classNames={{
          panel: " overflow-y-auto p-2",
        }}
        selectedKey={selectedTab}
        variant="underlined"
        onSelectionChange={(key) => setSelectedTab(key as string)}
      >
        <Tab key="collections" title="Collections">
          <h1 className="text-center text-xs bg-zinc-500/50 text-white rounded-md p-4 mt-8">
            🚧Coming Soon!🚧
          </h1>
        </Tab>
        <Tab key="browse" title="Browse">
          <FileTree />
        </Tab>
      </Tabs>
    </aside>
  );
}
