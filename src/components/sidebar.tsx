import { useEffect, useState } from "react";
import { Tab, Tabs } from "@heroui/tabs";

import { FileTree } from "@/features/file-browser/components/file-tree";
import { api } from "@/services/api";

export function Sidebar() {
  const [selectedTab, setSelectedTab] = useState("browse");

  useEffect(() => {
    api.renderer.initRenderer();
  }, []);

  return (
    <aside className="w-full h-full bg-zinc-900/99 border border-white/15 rounded-xl flex flex-col pl-2 p-2 gap-y-1 overflow-scroll overflow-x-hidden">
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
