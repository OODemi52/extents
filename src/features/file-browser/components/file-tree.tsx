import { Accordion, AccordionItem } from "@heroui/react";
import {
  FolderSimpleIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react/dist/ssr";

import { useVisibleNodes } from "../hooks/use-visible-nodes";

import { cn } from "@/lib/cn";
import { useFileSystemStore } from "@/features/file-browser/store/file-system-store";

export const FileTree = () => {
  const visibleNodes = useVisibleNodes();
  const { expandedKeys, setExpandedKeys, selectItem, selectedId } =
    useFileSystemStore();

  return (
    <div className="overflow-scroll h-full">
      {/*
        They tree structure is dynamically built as a "Folder" Accordian is expanded.
        Individually, walking the tree results in each command call return in ~under 10ms
        */}
      <Accordion
        fullWidth
        isCompact
        className="truncate"
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
              aria-label={`Folder: ${node.name}`}
              className="font-medium"
              classNames={{
                base: "shadow-none p-0",
                trigger: "h-8",
                title: "text-xs truncate",
                heading: cn("rounded-lg px-4 truncate", {
                  "bg-zinc-800/75": isSelected,
                }),
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
