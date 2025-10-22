import { AccordionItem } from "@heroui/react";
import {
  FolderOpenIcon,
  FolderSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";

import { useFolderChildren } from "../../hooks/use-folder-children";

import { cn } from "@/lib/cn";
import { useFileSystemStore } from "@/store/file-system-store";
import { TreeViewElement } from "@/types/file-system";

// This component fetches and renders the children of a folder
const FolderContent = ({ node }: { node: TreeViewElement }) => {
  const { data: children, isLoading, error } = useFolderChildren(node.id);

  if (isLoading) return <div className="pl-4 text-sm">Loading...</div>;
  if (error) return <div className="pl-4 text-sm text-red-500">Error</div>;

  return (
    <>
      {children?.map((childNode) => (
        <Folder key={childNode.id} node={childNode} />
      ))}
    </>
  );
};

// The main Folder component
export const Folder = ({ node }: { node: TreeViewElement }) => {
  const { selectedId, toggleExpanded, selectItem } = useFileSystemStore();
  const isSelected = selectedId === node.id;

  // This fixes the "can't click" bug. We handle selection and expansion separately.
  const handlePress = () => selectItem(node.id);
  const handleTrigger = () => toggleExpanded(node.id);

  return (
    <AccordionItem
      key={node.id}
      aria-label={node.name}
      startContent={
        <span className="text-lg">
          {/* We can check the store to see if it's expanded to show the right icon */}
          {useFileSystemStore.getState().expandedKeys.has(node.id) ? (
            <FolderOpenIcon size={20} weight="duotone" />
          ) : (
            <FolderSimpleIcon size={20} weight="duotone" />
          )}
        </span>
      }
      classNames={{
        base: cn("px-2 rounded-md", { "bg-neutral-700": isSelected }),
        trigger: "h-8",
        content: "pt-1 pl-4",
      }}
      // Use startContent for the icon, as you correctly pointed out
      title={node.name}
      onPress={handlePress}
      // The Accordion's own trigger will handle calling onSelectionChange
    >
      <FolderContent node={node} />
    </AccordionItem>
  );
};
