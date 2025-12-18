import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { FolderOpenIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip } from "@heroui/tooltip";
import { Tab, Tabs } from "@heroui/tabs";

import { FileTree } from "@/features/file-browser/components/file-tree";
import { api } from "@/services/api";

type SidebarProps = {
  onPickFolder: () => void;
};

export function Sidebar({ onPickFolder }: SidebarProps) {
  const [selectedTab, setSelectedTab] = useState("browse");
  const queryClient = useQueryClient();

  useEffect(() => {
    api.renderer.initRenderer().catch(console.error);
  }, []);

  const handlePickFolder = async () => {
    onPickFolder();
    await queryClient.invalidateQueries({ queryKey: ["fileTree"] });
  };

  return (
    <aside className="w-full h-full bg-zinc-900/99 border border-white/15 rounded-xl flex flex-col pl-2 p-2 gap-y-1 overflow-scroll overflow-x-hidden">
      <div className="flex flex-row gap-3 py-2 px-4 flex-shrink-0">
        <Input
          isDisabled
          placeholder="    Search Coming Soon..."
          radius="sm"
          startContent={
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              size={16}
              weight="bold"
            />
          }
        />
        <Tooltip
          className="border border-zinc-500"
          closeDelay={0}
          content="Open Folder"
          delay={1000}
          radius="sm"
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
            <FolderOpenIcon size={18} weight="fill" />
          </Button>
        </Tooltip>
      </div>

      <Tabs
        aria-label="File Tabs"
        className="flex flex-col min-h-0"
        classNames={{
          panel: "overflow-y-auto flex-1",
          tabList: "flex-shrink-0",
        }}
        selectedKey={selectedTab}
        variant="solid"
        onSelectionChange={(key) => setSelectedTab(key as string)}
      >
        <Tab key="collections" title="Collections">
          <h1 className="text-center text-xs bg-zinc-500/50 text-white rounded-md p-4 mt-8">
            Collections Comming Soon...
          </h1>
        </Tab>
        <Tab key="browse" title="Browse">
          <FileTree />
        </Tab>
      </Tabs>
    </aside>
  );
}
