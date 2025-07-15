import { Button } from "@heroui/button";

import { useImageStore } from "../store/image-store";

interface SidebarProps {
  onPickFolder: () => Promise<void>;
  hasImages: boolean;
}

export function Sidebar({ onPickFolder, hasImages }: SidebarProps) {
  const { fileMetadataList, selectedIndex } = useImageStore();

  return (
    <div className=" bg-zinc-950/50 p-4 flex flex-col">
      <Button className="bg-secondary-500 w-full" onPress={onPickFolder}>
        {hasImages ? "Change Folder" : "Pick Folder"}
      </Button>

      {hasImages && (
        <div className="mt-4 mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">
          Files
        </div>
      )}

      <div className="flex-grow overflow-y-auto">
        <div className="flex flex-col gap-2 text-sm pr-1">
          {fileMetadataList.map((file, idx) => (
            <div
              key={file.path}
              className={`truncate p-1 px-2 rounded cursor-pointer ${
                selectedIndex === idx
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              {file.fileName}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
