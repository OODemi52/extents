import { Button } from "@heroui/button";

interface HeaderProps {
  onPickFolder: () => Promise<void>;
  hasImages: boolean;
}

export function Header({ onPickFolder, hasImages }: HeaderProps) {
  return (
    <div className="p-4 bg-transparent dark:bg-gray-800">
      <Button className="bg-secondary-500" onPress={onPickFolder}>
        {hasImages ? "Change Folder" : "Pick Folder"}
      </Button>
    </div>
  );
}
