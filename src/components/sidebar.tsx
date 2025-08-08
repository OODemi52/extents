import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { invoke } from "@tauri-apps/api/core";
import { Listbox, ListboxItem } from "@heroui/listbox";
import { ArrowLeftIcon, FolderIcon } from "@phosphor-icons/react";
import { Key } from "@react-types/shared";
import { FolderNotchOpenIcon } from "@phosphor-icons/react/dist/ssr";
import { Dropdown, DropdownItem } from "@heroui/dropdown";

import { useImageStore } from "../store/image-store";

interface SidebarProps {
  onPickFolder: (path: string) => Promise<void>;
  hasImages: boolean;
}

export function Sidebar({ onPickFolder }: SidebarProps) {
  const { folderList, setFolderList, currentFolderPath, setCurrentFolderPath } =
    useImageStore();

  const [folderHistory, setFolderHistory] = useState<string[]>([]);

  const [subdirectoryList, setSubdirectoryList] = useState<string[]>([]);

  useEffect(() => {
    if (currentFolderPath) {
      invoke<string[]>("scan_dir_struct", { path: currentFolderPath }).then(
        setFolderList,
      );
      console.log(folderList);
    }
  }, [currentFolderPath]);

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
    invoke<string[]>("scan_dir_struct", {
      path: currentFolderPath,
    }).then(setFolderList);
  }, [currentFolderPath]);

  return (
    <div className=" bg-zinc-950/50 py-0 flex flex-col min-w-60 w-60 overflow-scroll">
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
        className="flex-1"
        classNames={{ list: "", base: "", emptyContent: "" }}
        items={folderList
          .filter((folderPath) => {
            const folderName = folderPath.split("/").pop() || folderPath;

            return !folderName.startsWith(".");
          })
          .sort((a, b) => {
            const aName = a.split("/").pop() || a;
            const bName = b.split("/").pop() || b;

            return aName.localeCompare(bName);
          })
          .map((folderPath) => ({
            key: folderPath,
            label: folderPath.split("/").pop() || folderPath,
          }))}
        virtualization={{
          maxListboxHeight: 1000,
          itemHeight: 32,
        }}
        onAction={handleNextFolderPath}
      >
        {(item) => (
          <ListboxItem
            key={item.key}
            className={""}
            classNames={{ title: "font-light text-sm" }}
            color={item.key === "delete" ? "danger" : "default"}
            startContent={<FolderIcon />}
            onPress={() => console.log("clicked")}
          >
            {item.label}
          </ListboxItem>
        )}
      </Listbox>
    </div>
  );
}
