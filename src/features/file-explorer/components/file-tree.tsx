import { Accordion, AccordionItem } from "@heroui/react";
import { FolderSimple, FolderOpen } from "@phosphor-icons/react";

import { useFolderChildren } from "../hooks/use-folder-children";

import { useFileSystemStore } from "@/store/file-system-store";
import { TreeNode } from "@/types/file-system";
import { cn } from "@/lib/cn";

// This component fetches and renders the children for a given node
const FolderContents = ({ node }: { node: TreeNode }) => {
  const { data: children, isLoading, error } = useFolderChildren(node.id);

  if (isLoading)
    return <div className="pl-5 text-sm text-neutral-500">Loading...</div>;
  if (error) return <div className="pl-5 text-sm text-red-500">Error</div>;
  if (!children) return null;

  // Recursively render the next level of folders
  return (
    <>
      {children.map((childNode) => (
        <FolderItem key={childNode.id} node={childNode} />
      ))}
    </>
  );
};

// This component represents one folder in the tree
const FolderItem = ({ node }: { node: TreeNode }) => {
  const { selectedId, expandedKeys, selectItem } = useFileSystemStore();
  const isSelected = selectedId === node.id;
  const isOpen = expandedKeys.has(node.id);

  return (
    <AccordionItem
      key={node.id}
      aria-label={node.name}
      classNames={{
        base: cn("rounded-md", { "bg-neutral-700": isSelected }),
        trigger: "h-8 px-2",
        content: "pt-1 pl-4",
      }}
      startContent={
        isOpen ? (
          <FolderOpen size={20} weight="duotone" />
        ) : (
          <FolderSimple size={20} weight="duotone" />
        )
      }
      title={node.name}
      onPress={() => selectItem(node.id)}
    >
      {/* Conditionally render children only if the item is open */}
      {isOpen && <FolderContents node={node} />}
    </AccordionItem>
  );
};

// This is the main entry point component for your sidebar
export const FileTree = () => {
  const { expandedKeys, setExpandedKeys } = useFileSystemStore();

  const rootNode: TreeNode = {
    id: "/",
    name: "My Computer",
    children: [],
  };

  return (
    <div className="overflow-auto h-full px-2">
      <Accordion selectionMode="multiple">
        <AccordionItem key="A" title="Users">
          b<AccordionItem>b</AccordionItem>
          <AccordionItem key="B" title="oodemi">
            b
            <AccordionItem key="C" title="Pictures">
              e
            </AccordionItem>
          </AccordionItem>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
