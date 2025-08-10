import type { Key } from "@react-types/shared";

import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { Button } from "@heroui/button";
import { Listbox, ListboxItem } from "@heroui/listbox";
import {
  ArrowLeftIcon,
  CaretDownIcon,
  CaretRightIcon,
  CaretLeftIcon,
  ListIcon,
} from "@phosphor-icons/react";
import {
  FolderNotchOpenIcon,
  FolderOpenIcon,
  FolderSimpleIcon,
  HouseIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMemo, useState } from "react";

interface Directory {
  path: string;
  parentId: string | null;
}

interface NodeItem {
  id: string;
  path: string;
  label: string;
  parentId: string | null;
  depth: number;
  hasChildren: boolean;
}

interface SidebarProps {
  onPickFolder: (path: string) => Promise<void>;
  hasImages?: boolean;
}

export function Sidebar({ onPickFolder }: SidebarProps) {
  const [folderMap, setFolderMap] = useState<Record<string, Directory>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchFolderMap = async () => {
      try {
        const result = await invoke<Record<string, Directory>>(
          "build_fs_tree",
          {
            scanLevel: 3,
          },
        );

        setFolderMap(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error fetching folder map", err);
      }
    };

    fetchFolderMap();
  }, []);

  useEffect(() => {
    if (Object.keys(folderMap).length > 0) {
      const roots = Object.entries(folderMap)
        .filter(([_, dir]) => dir.parentId === null)
        .map(([id]) => id);

      setExpanded(new Set(roots));
    }
  }, [folderMap]);

  const { childrenMap, nodesById } = useMemo(() => {
    const childrenMap = new Map<string | null, string[]>();
    const nodesById = new Map<string, Directory>();

    for (const [id, dir] of Object.entries(folderMap)) {
      nodesById.set(id, dir);
      const parent = dir.parentId;

      childrenMap.set(parent, [...(childrenMap.get(parent) || []), id]);
    }

    return { childrenMap, nodesById };
  }, [folderMap]);

  const visibleNodes = useMemo(() => {
    const out: NodeItem[] = [];

    const pushNode = (id: string, depth: number) => {
      const dir = nodesById.get(id)!;
      const children = childrenMap.get(id) || [];
      const hasChildren = children.length > 0;

      out.push({
        id,
        path: dir.path,
        label: dir.path.split("/").pop() || dir.path,
        parentId: dir.parentId,
        depth,
        hasChildren,
      });

      if (expanded.has(id)) {
        for (const childId of children.sort()) {
          pushNode(childId, depth + 1);
        }
      }
    };

    const roots = childrenMap.get(null) || [];

    for (const rootId of roots.sort()) {
      pushNode(rootId, 1);
    }

    return out;
  }, [childrenMap, nodesById, expanded]);

  // Toggle expansion
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  // click handler for a row: expand (if folder has children) and open folder
  const handleRowClick = async (item: NodeItem) => {
    if (item.hasChildren) toggleExpand(item.id);
    // update history and open in main view
    setHistory((h) => [...h, item.path]);
    await onPickFolder(item.path);
  };

  // Convert visibleNodes into the items array Listbox expects
  const listboxItems = visibleNodes.map((n) => ({
    key: n.path,
    label: n.label,
    path: n.path,
    id: n.id,
    depth: n.depth,
    hasChildren: n.hasChildren,
  }));

  if (isCollapsed) {
    return (
      <div className="bg-zinc-950/50 text-zinc-100/80 flex flex-col w-12 items-center py-2 transition-all duration-300 ease-in-out">
        <Button
          disableRipple
          isIconOnly
          className="bg-transparent hover:bg-zinc-800/50"
          size="sm"
          onPress={() => setIsCollapsed(false)}
        >
          <ListIcon size={20} />
        </Button>
      </div>
    );
  }

  if (!Object.keys(folderMap).length) {
    return (
      <div className="bg-zinc-950/50 text-zinc-100/80 flex flex-col min-w-64 w-64 transition-all duration-300 ease-in-out">
        <div className="p-4 text-zinc-400">Loading folders...</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/50 text-zinc-100/80 flex flex-col min-w-64 w-64 transition-all duration-300 ease-in-out">
      {/* Header with navigation buttons */}
      <div className="flex justify-between px-2 py-2 items-center border-b border-zinc-800/50">
        <div className="flex gap-1">
          <Button
            disableRipple
            isIconOnly
            className="bg-transparent hover:bg-zinc-800/50"
            size="sm"
            onPress={() => setIsCollapsed(true)}
          >
            <CaretLeftIcon size={20} />
          </Button>

          <Button
            disableRipple
            isIconOnly
            className="bg-transparent hover:bg-zinc-800/50 disabled:opacity-30"
            isDisabled={history.length === 0}
            size="sm"
            onPress={() => {
              if (history.length > 1) {
                const prev = history[history.length - 2];

                setHistory((h) => h.slice(0, -1));
                onPickFolder(prev);
              }
            }}
          >
            <ArrowLeftIcon size={20} />
          </Button>
        </div>

        <Button
          disableRipple
          isIconOnly
          className="bg-transparent hover:bg-zinc-800/50"
          size="sm"
          // eslint-disable-next-line no-console
          onPress={() => console.log("Open browse dialog")}
        >
          <FolderNotchOpenIcon size={20} />
        </Button>
      </div>

      {/* Scrollable list container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Listbox
          isVirtualized
          aria-label="User Directory"
          className="w-full"
          classNames={{
            list: "px-1",
          }}
          items={listboxItems}
          virtualization={{ maxListboxHeight: 1000, itemHeight: 36 }}
          onAction={(key: Key) => {
            const item = visibleNodes.find((v) => v.path === key);

            if (item) handleRowClick(item);
          }}
        >
          {(item: any) => {
            const paddingLeft = `${(item.depth - 1) * 20 + 8}px`;

            return (
              <ListboxItem
                key={item.key}
                className="relative flex items-center gap-1 hover:bg-gradient-to-r from-yellow-500/75 to-yellow-300/45 data-selected:bg-transparent rounded-md my-0.5 overflow-hidden overscroll-none"
                style={{ paddingLeft }}
                textValue={item.label}
              >
                <div className="flex items-center justify-between w-full overflow-hidden overscroll-none">
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden overscroll-none">
                    {/* Folder icon */}
                    <span className="flex-shrink-0">
                      {item.depth <= 1 ? (
                        <HouseIcon
                          className="text-zinc-200"
                          size={16}
                          weight="fill"
                        />
                      ) : expanded.has(item.id) ? (
                        <FolderOpenIcon
                          className="text-zinc-200"
                          size={16}
                          weight="duotone"
                        />
                      ) : (
                        <FolderSimpleIcon
                          className="text-zinc-200"
                          size={16}
                          weight="duotone"
                        />
                      )}
                    </span>

                    {/* Label with proper truncation */}
                    <label
                      className={`text-xs truncate block ${
                        item.depth <= 1
                          ? "font-semibold text-sm text-zinc-200"
                          : "text-zinc-300"
                      }`}
                      title={item.label}
                    >
                      {item.label.length > 20
                        ? `${item.label.slice(0, 20)}...`
                        : item.label}
                    </label>
                  </div>

                  {/* Expand/collapse button */}
                  {item.hasChildren && (
                    <Button
                      disableRipple
                      isIconOnly
                      className="bg-transparent ml-1 flex-shrink-0"
                      size="sm"
                      onPress={() => {
                        toggleExpand(item.id);
                      }}
                    >
                      {expanded.has(item.id) ? (
                        <CaretDownIcon size={14} />
                      ) : (
                        <CaretRightIcon size={14} />
                      )}
                    </Button>
                  )}
                </div>
              </ListboxItem>
            );
          }}
        </Listbox>
      </div>
    </div>
  );
}
