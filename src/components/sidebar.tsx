import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { invoke } from "@tauri-apps/api/core";
import { Listbox, ListboxItem } from "@heroui/listbox";
import { ArrowLeftIcon, FolderIcon } from "@phosphor-icons/react";
import { Key } from "@react-types/shared";
import { FolderNotchOpenIcon } from "@phosphor-icons/react/dist/ssr";

import { useImageStore } from "../store/image-store";

interface SidebarProps {
  onPickFolder: (path: string) => Promise<void>;
  hasImages: boolean;
}

export function Sidebar({ onPickFolder }: SidebarProps) {
  const { folderList, setFolderList, currentFolderPath, setCurrentFolderPath } =
    useImageStore();

  const [folderHistory, setFolderHistory] = useState<string[]>([]);

  useEffect(() => {
    folderHistory.push(currentFolderPath as string);
  }, [currentFolderPath]);

  const handleNextFolderPath = async (key: Key) => {
    if (currentFolderPath && currentFolderPath !== key) {
      setFolderHistory((prev) => [...prev, key as string]);
    }
    setCurrentFolderPath(key as string);

    onPickFolder(key as string);
  };

  const handlePrevFolderPath = () => {
    if (folderHistory.length > 1) {
      const prevPath = folderHistory[folderHistory.length - 2];

      setCurrentFolderPath(prevPath);

      setFolderHistory((prev) => prev.slice(0, -1));
    }
  };

  const handleBrowseFolders = () => {
    onPickFolder;
  };

  useEffect(() => {
    invoke<string[]>("scan_folders", {
      path: currentFolderPath,
    }).then(setFolderList);
  }, [currentFolderPath]);

  return (
    <div className=" bg-zinc-950/50 p-4 flex flex-col min-w-1/6 w-1/6 overflow-scroll">
      <div className="flex justify-between">
        <Button
          disableRipple
          isIconOnly
          className="bg-transparent"
          onPress={handlePrevFolderPath}
        >
          <ArrowLeftIcon />
        </Button>

        <Button
          disableRipple
          isIconOnly
          className="bg-transparent"
          onPress={handleBrowseFolders}
        >
          <FolderNotchOpenIcon size={20} />
        </Button>
      </div>
      <Listbox
        isVirtualized
        aria-label="User Directory"
        className="h-full"
        classNames={{ list: "border border-dashed border-red-500 h-[100%]" }}
        items={folderList.map((folderPath) => ({
          key: folderPath,
          label: folderPath.split("/").pop() || folderPath,
        }))}
        virtualization={{
          maxListboxHeight: 400,
          itemHeight: 40,
        }}
        onAction={handleNextFolderPath}
      >
        {(item) => (
          <ListboxItem
            key={item.key}
            className={""}
            color={item.key === "delete" ? "danger" : "default"}
            startContent={<FolderIcon />}
          >
            {item.label}
          </ListboxItem>
        )}
      </Listbox>
    </div>
  );
}
