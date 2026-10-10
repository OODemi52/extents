import type { FlatNode } from "@/features/file-browser/utils/tree";

import { memo, useRef, type KeyboardEvent } from "react";
import { Button } from "@heroui/react";
import {
  FolderSimpleIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react/dist/ssr";
import { CaretLeftIcon } from "@phosphor-icons/react";

import { useVisibleNodes } from "../hooks/use-visible-nodes";

import { cn } from "@/lib/cn";
import { useFileSystemStore } from "@/features/file-browser/store/file-system-store";

const INDENT_SIZE = 18;
const GUIDE_OFFSET = 12;

export const FileTree = memo(function FileTree() {
  const visibleNodes = useVisibleNodes();
  const expandedKeys = useFileSystemStore((state) => state.expandedKeys);
  const setExpandedKeys = useFileSystemStore((state) => state.setExpandedKeys);
  const selectItem = useFileSystemStore((state) => state.selectItem);
  const selectedId = useFileSystemStore((state) => state.selectedId);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  const setFolderExpanded = (nodeId: string, expanded: boolean) => {
    const currentKeys = useFileSystemStore.getState().expandedKeys;
    const nextKeys =
      currentKeys instanceof Set ? new Set(currentKeys) : new Set<string>();

    if (expanded) {
      nextKeys.add(nodeId);
    } else {
      nextKeys.delete(nodeId);
    }

    setExpandedKeys(nextKeys);
  };

  const openFolder = (node: FlatNode, isOpen: boolean) => {
    if (useFileSystemStore.getState().selectedId !== node.id) {
      selectItem(node.id);
    }

    if (!isOpen) {
      setFolderExpanded(node.id, true);
    }
  };

  const focusItem = (index: number) => {
    const node = visibleNodes[index];

    if (node) {
      itemRefs.current.get(node.id)?.focus();
    }
  };

  const handleItemKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(Math.min(index + 1, visibleNodes.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(visibleNodes.length - 1);
        break;
    }
  };

  return (
    <nav
      aria-label="Folders"
      className="h-full w-full py-1"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
      }}
    >
      <ul>
        {visibleNodes.map((node, index) => {
          const isSelected = selectedId === node.id;
          const isOpen =
            expandedKeys instanceof Set && expandedKeys.has(node.id);

          return (
            <li
              key={node.id}
              className="relative isolate flex min-h-10 items-center rounded-xl px-1"
            >
              {node.level > 0 ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0"
                >
                  {node.ancestorGuideContinuations.map(
                    (shouldContinue, level) =>
                      shouldContinue ? (
                        <span
                          key={level}
                          className="absolute inset-y-0 w-px bg-white/[0.085]"
                          style={{ left: GUIDE_OFFSET + level * INDENT_SIZE }}
                        />
                      ) : null,
                  )}
                  <span
                    className="absolute top-0 h-1/2 w-3 rounded-bl-md border-b border-l border-white/[0.085]"
                    style={{
                      left: GUIDE_OFFSET + (node.level - 1) * INDENT_SIZE,
                    }}
                  />
                  {node.hasNextSibling ? (
                    <span
                      className="absolute bottom-0 h-1/2 w-px bg-white/[0.085]"
                      style={{
                        left: GUIDE_OFFSET + (node.level - 1) * INDENT_SIZE,
                      }}
                    />
                  ) : null}
                </span>
              ) : null}

              {isOpen && node.children.length > 0 ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 z-0 h-1/2 w-px bg-white/[0.085]"
                  style={{
                    left: GUIDE_OFFSET + node.level * INDENT_SIZE,
                  }}
                />
              ) : null}

              {isSelected ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[1] rounded-xl bg-zinc-800"
                />
              ) : null}

              <Button
                ref={(element) => {
                  if (element) {
                    itemRefs.current.set(node.id, element);
                  } else {
                    itemRefs.current.delete(node.id);
                  }
                }}
                aria-current={isSelected ? "page" : undefined}
                aria-expanded={isOpen}
                className="editor-focus-ring relative z-[2] h-9 min-w-0 flex-1 justify-start gap-2 rounded-lg bg-transparent pr-2 text-[13px] font-normal leading-5 text-zinc-300 data-[hover=true]:!bg-transparent"
                size="sm"
                style={{ paddingLeft: 8 + node.level * INDENT_SIZE }}
                variant="ghost"
                onKeyDown={(event) => handleItemKeyDown(event, index)}
                onPress={() => openFolder(node, isOpen)}
              >
                {isOpen ? (
                  <FolderOpenIcon
                    className="shrink-0 text-zinc-300"
                    size={16}
                    weight="fill"
                  />
                ) : (
                  <FolderSimpleIcon
                    className="shrink-0 text-zinc-500"
                    size={16}
                  />
                )}
                <span className="min-w-0 truncate" title={node.name}>
                  {node.name}
                </span>
              </Button>

              <Button
                isIconOnly
                aria-label={`${isOpen ? "Collapse" : "Expand"} ${node.name}`}
                className="editor-focus-ring relative z-[2] ml-2 mr-1 h-7 w-7 min-w-7 shrink-0 rounded-lg text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-200"
                size="sm"
                variant="ghost"
                onPress={() => setFolderExpanded(node.id, !isOpen)}
              >
                <CaretLeftIcon
                  aria-hidden="true"
                  className={cn("transition-transform", {
                    "-rotate-90": isOpen,
                  })}
                  size={14}
                  weight="bold"
                />
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
