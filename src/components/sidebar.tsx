import type { Key } from "@react-types/shared";

import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { Button } from "@heroui/button";
import { Listbox, ListboxItem } from "@heroui/listbox";
import {
  ArrowLeftIcon,
  CaretDownIcon,
  CaretRightIcon,
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
        console.error("Error fetching folder map", err);
      }
    };

    fetchFolderMap();
  }, []);

  console.log(folderMap);

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

  if (!Object.keys(folderMap).length) {
    return <div className="p-4 text-zinc-400">Loading folders...</div>;
  }

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

  // Convert visibleNodes into the items array Listbox expects.
  // We include depth and hasChildren on the item so the renderer can use them.
  const listboxItems = visibleNodes.map((n) => ({
    key: n.path,
    label: n.label,
    path: n.path,
    id: n.id,
    depth: n.depth,
    hasChildren: n.hasChildren,
  }));

  return (
    <div className="bg-zinc-950/50 text-zinc-100/80 py-0 flex flex-col min-w-60 w-60 overflow-auto">
      <div className="flex justify-between px-2 py-1 items-center">
        <Button
          disableRipple
          isIconOnly
          className="bg-transparent"
          onPress={() => {
            // simple back navigation
            if (history.length > 0) {
              const prev = history[history.length - 1];

              setHistory((h) => h.slice(0, -1));
              onPickFolder(prev);
            }
          }}
        >
          <ArrowLeftIcon />
        </Button>

        <Button
          disableRipple
          isIconOnly
          className="bg-transparent"
          // eslint-disable-next-line no-console
          onPress={() => console.log("Open browse dialog")}
        >
          <FolderNotchOpenIcon size={20} />
        </Button>
      </div>

      <Listbox
        isVirtualized
        aria-label="User Directory"
        className="flex-1"
        items={listboxItems}
        virtualization={{ maxListboxHeight: 1000, itemHeight: 32 }}
        onAction={(key: Key) => {
          const item = visibleNodes.find((v) => v.path === key);

          if (item) handleRowClick(item);
        }}
      >
        {(item: any) => {
          const leftPad = `${(item.depth ?? 0) * 16 - 16}px`;

          return (
            <ListboxItem
              key={item.key}
              className="flex text-ellipsis items-center gap-2 px-2 hover:bg-gradient-to-r from-yellow-500/75 to-transparent"
              endContent={
                <Button
                  disableRipple
                  isIconOnly
                  className="bg-transparent"
                  onPress={() => {
                    if (item.hasChildren) toggleExpand(item.id);
                  }}
                >
                  {item.hasChildren ? (
                    expanded.has(item.id) ? (
                      <CaretDownIcon />
                    ) : (
                      <CaretRightIcon />
                    )
                  ) : null}
                </Button>
              }
              startContent={
                item.depth <= 1 ? (
                  <HouseIcon size={14} weight="fill" />
                ) : expanded.has(item.id) ? (
                  <FolderOpenIcon size={14} weight="duotone" />
                ) : (
                  <FolderSimpleIcon size={14} weight="duotone" />
                )
              }
              variant="shadow"
            >
              <div
                className={`flex items-center gap-2 w-full`}
                style={{
                  paddingLeft: leftPad,
                }}
              >
                <p
                  className={`text-ellipsis text-xs font-normal ${item.depth <= 1 ? "font-bold" : ""}`}
                >
                  {item.label}
                </p>
              </div>
            </ListboxItem>
          );
        }}
      </Listbox>
    </div>
  );
}
