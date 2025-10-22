import { Accordion, AccordionItem } from "@heroui/react";
import {
  FolderSimpleIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react/dist/ssr";

import { useVisibleNodes } from "../hooks/use-visible-nodes";

import { cn } from "@/lib/cn";
import { useFileSystemStore } from "@/features/file-explorer/store/file-system-store";

export const FileTree = () => {
  const visibleNodes = useVisibleNodes();
  const { expandedKeys, setExpandedKeys, selectItem, selectedId } =
    useFileSystemStore();

  return (
    <div className="overflow-scroll h-full">
      {/*
        The Accordian component is recursively called as children of the AccordionItem component
        They tree structure is dynamically built as a "Folder" Accordian is expanded.
        Individually, walking the tree results in each command call return in ~under 10ms
        */}
      <Accordion
        isCompact
        className="w-full"
        selectedKeys={expandedKeys}
        selectionMode="multiple"
        variant="splitted"
        onSelectionChange={setExpandedKeys}
      >
        {visibleNodes.map((node) => {
          const isSelected = selectedId === node.id;
          const isOpen =
            expandedKeys instanceof Set && expandedKeys.has(node.id);

          return (
            <AccordionItem
              key={node.id}
              isCompact
              aria-label={node.name}
              className="font-medium"
              classNames={{
                base: cn(
                  "rounded-none",
                  "shadow-none",
                  "outline-none",
                  "",
                  "bg-transparent",
                  {
                    "bg-zinc-800": isSelected,
                  },
                ),
                trigger: "h-8",
                title: "text-xs truncate",
                content: "hidden",
              }}
              startContent={
                isOpen ? (
                  <FolderOpenIcon size={16} weight="fill" />
                ) : (
                  <FolderSimpleIcon size={16} />
                )
              }
              style={{ paddingLeft: `${node.level * 18}px` }}
              title={node.name}
              onPress={() => selectItem(node.id)}
            />
          );
        })}
      </Accordion>
    </div>
  );
};
