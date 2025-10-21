import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { invoke } from "@tauri-apps/api/core";
import {
  FolderOpenIcon,
  MagnifyingGlassIcon,
  CaretRightIcon,
  CaretDownIcon,
  FolderIcon,
} from "@phosphor-icons/react";

type SidebarProps = {
  onPickFolder: () => void;
  hasImages: boolean;
};

interface FolderItem {
  id: string;
  name: string;
  children?: FolderItem[];
}

const mockFolders: FolderItem[] = [
  { id: "1", name: "Recent" },
  {
    id: "2",
    name: "Projects",
    children: [
      { id: "2-1", name: "Wedding 2024" },
      { id: "2-2", name: "Portraits" },
      { id: "2-3", name: "Landscape" },
    ],
  },
  {
    id: "3",
    name: "Collections",
    children: [
      { id: "3-1", name: "Best of 2024" },
      { id: "3-2", name: "Client Work" },
    ],
  },
];

// Utility to merge class names (mini version of `cn`)
function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function FolderTree({
  folder,
  level = 0,
  selectedFolder,
  setSelectedFolder,
}: {
  folder: FolderItem;
  level?: number;
  selectedFolder: string | null;
  setSelectedFolder: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <Button
        className={classNames(
          "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors bg-transparent justify-start",
          selectedFolder === folder.id && "bg-neutral-300 dark:bg-neutral-700",
        )}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onPress={() => {
          if (hasChildren) setIsExpanded(!isExpanded);
          setSelectedFolder(folder.id);
        }}
      >
        {hasChildren && (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <CaretDownIcon size={14} weight="bold" />
            ) : (
              <CaretRightIcon size={14} weight="bold" />
            )}
          </span>
        )}
        <FolderIcon className="flex-shrink-0" size={16} weight="fill" />
        <span className="truncate">{folder.name}</span>
      </Button>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {folder.children!.map((child) => (
            <FolderTree
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onPickFolder, hasImages }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Initialize WGPU renderer once when component mounts
  useEffect(() => {
    const init = async () => {
      try {
        await invoke("init_renderer");
        console.log("Renderer initialized successfully!");
      } catch (e) {
        console.error("Failed to initialize renderer:", e);
      }
    };

    init();
  }, []);

  return (
    <aside className="bg-zinc-900/99 border border-white/15 rounded-xl flex flex-col min-w-68 w-68 my-2 ml-2 py-2">
      {/* Header Controls */}
      <div className="flex flex-col gap-3 p-2">
        <h1>Browse</h1>
        <Button
          disableRipple
          isIconOnly
          className="bg-transparent"
          color="secondary"
          onPress={onPickFolder}
        >
          <FolderOpenIcon size={18} weight="fill" />
        </Button>

        <div className="relative">
          <Input
            radius="sm"
            startContent={
              <MagnifyingGlassIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                size={16}
                weight="bold"
              />
            }
            placeholder="    Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Folder Tree (scrollable) */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="space-y-1 pb-4">
          {mockFolders
            .filter((f) =>
              f.name.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((folder) => (
              <FolderTree
                key={folder.id}
                folder={folder}
                selectedFolder={selectedFolder}
                setSelectedFolder={setSelectedFolder}
              />
            ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-300 dark:border-neutral-700 p-4 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex justify-between">
          <span>Storage</span>
          <span>45.2 GB / 100 GB</span>
        </div>
      </div>
    </aside>
  );
}
