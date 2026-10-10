import { memo, useState } from "react";
import { Tabs } from "@heroui/react";
import { ImagesIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/ui/empty-state";
import { FileTree } from "@/features/file-browser/components/file-tree";

export const Sidebar = memo(function Sidebar() {
  const [selectedTab, setSelectedTab] = useState("browse");

  return (
    <aside className="editor-panel flex h-full w-full flex-col gap-y-1 overflow-hidden p-2">
      <Tabs
        aria-label="Library sections"
        className="flex min-h-0 flex-col text-muted"
        selectedKey={selectedTab}
        variant="secondary"
        onSelectionChange={(key) => setSelectedTab(key as string)}
      >
        <Tabs.ListContainer className="editor-surface shrink-0 rounded-[16px] p-1">
          <Tabs.List className="grid grid-cols-2 gap-1 bg-transparent p-0">
            <Tabs.Tab
              className="h-8 rounded-xl text-xs text-zinc-400 data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-zinc-100"
              id="collections"
            >
              Collections
            </Tabs.Tab>
            <Tabs.Tab
              className="h-8 rounded-xl text-xs text-zinc-400 data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-zinc-100"
              id="browse"
            >
              Browse
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel
          className="min-h-0 flex-1 overflow-y-auto px-0.5"
          id="collections"
        >
          <EmptyState
            compact
            className="mt-6"
            graphic={
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-zinc-500">
                <ImagesIcon size={20} weight="duotone" />
              </span>
            }
            title="Collections unavailable"
          />
        </Tabs.Panel>
        <Tabs.Panel
          className="min-h-0 flex-1 overflow-y-auto px-0.5"
          id="browse"
        >
          <FileTree />
        </Tabs.Panel>
      </Tabs>
    </aside>
  );
});
