import { useState } from "react";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Selection } from "@heroui/react";
import {
  FolderSimpleIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react/dist/ssr";

import { useFileTree } from "../hooks/use-file-tree";

import { Folder } from "./ui/folder";
import { TreeProvider, TreeViewElement } from "./ui/tree";

// ! - This function renders the file tree representation recursively
const renderFolders = (nodes: TreeViewElement[]) => {
  return nodes.map((node) => (
    <AccordionItem key={node.id} title={node.name} value={node.id}>
      {node.children &&
        node.children.length > 0 &&
        renderFolders(node.children)}
    </AccordionItem>
  ));
};

export const FileTree = () => {
  const { tree, isLoading, error } = useFileTree();

  console.log(tree);

  const [expandedKeys, setExpandedKeys] = useState<Selection>(new Set());

  if (isLoading) {
    return <div>Loading tree...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading file tree.</div>;
  }

  return (
    <TreeProvider
      closeIcon={<FolderSimpleIcon size={20} weight="duotone" />}
      openIcon={<FolderOpenIcon size={20} weight="duotone" />}
    >
      <div className="h-full px-2 overflow-scroll">
        <Accordion
          selectedKeys={expandedKeys}
          selectionMode="multiple"
          onSelectionChange={setExpandedKeys}
        >
          {renderFolders(tree)}
        </Accordion>
      </div>
    </TreeProvider>
  );
};
