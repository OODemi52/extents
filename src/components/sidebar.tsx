import { useState } from "react";
import { Tab, Tabs } from "@heroui/tabs";

import { FileTree } from "@/features/file-browser/components/file-tree";

export function Sidebar() {
  const [selectedTab, setSelectedTab] = useState("browse");

  return (
    <aside className="w-full h-full border border-zinc-700/50 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] bg-[rgba(30,30,30,0.99)] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] rounded-3xl flex flex-col pl-2 p-2 gap-y-1 overflow-scroll overflow-x-hidden">
      <div className="pointer-events-none w-10/12 mx-auto absolute inset-x-0 top-0 z-20 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
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
