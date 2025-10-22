import { AccordionItem } from "@heroui/react";
import {
  FolderSimpleIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react/dist/ssr";

import { useTree } from "./tree";

import { cn } from "@/lib/cn";

type FolderProps = {
  element: string;
  value: string;
  children?: React.ReactNode;
  className?: string;
};

export const Folder = ({
  className,
  element,
  value,
  children,
  ...props
}: FolderProps) => {
  const { selectItem, selectedId, openIcon, closeIcon } = useTree();
  const isSelected = selectedId === value;

  const titleContent = (
    <div className="flex items-center gap-1.5">
      <span>{element}</span>
    </div>
  );

  return (
    <AccordionItem
      {...props}
      key={value}
      aria-label={element}
      classNames={{
        base: cn(
          "px-2 rounded-md",
          { "bg-neutral-700": isSelected },
          className,
        ),
        trigger: "h-8",
        indicator: "text-lg",
        content: "pl-4",
      }}
      indicator={({ isOpen }) =>
        isOpen
          ? (openIcon ?? <FolderOpenIcon size={20} weight="duotone" />)
          : (closeIcon ?? <FolderSimpleIcon size={20} weight="duotone" />)
      }
      title={titleContent}
      onPress={() => selectItem(value)}
    >
      {children}
    </AccordionItem>
  );
};

Folder.displayName = "Folder";
