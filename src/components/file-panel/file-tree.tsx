import type { ButtonProps } from "@heroui/button";

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { FileIcon, FolderIcon } from "@phosphor-icons/react";
import { Button } from "@heroui/button";
import { ScrollShadow } from "@heroui/scroll-shadow";

import { cn } from "@/lib/cn";
type TreeViewElement = {
  id: string;
  name: string;
  isSelectable?: boolean;
  children?: TreeViewElement[];
};

type TreeContextProps = {
  selectedId: string | undefined;
  expandedItems: string[] | undefined;
  indicator: boolean;
  handleExpand: (id: string) => void;
  selectItem: (id: string) => void;
  setExpandedItems?: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  direction: "rtl" | "ltr";
};

const TreeContext = createContext<TreeContextProps | null>(null);

const useTree = () => {
  const context = useContext(TreeContext);

  if (!context) throw new Error("useTree must be used within a TreeProvider");

  return context;
};

type Direction = "rtl" | "ltr" | undefined;

type TreeViewProps = {
  initialSelectedId?: string;
  indicator?: boolean;
  elements?: TreeViewElement[];
  initialExpandedItems?: string[];
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

const Tree = forwardRef<HTMLDivElement, TreeViewProps>(
  (
    {
      className,
      elements,
      initialSelectedId,
      initialExpandedItems,
      children,
      indicator = true,
      openIcon,
      closeIcon,
      dir,
      ...props
    },
    ref,
  ) => {
    const [selectedId, setSelectedId] = useState<string | undefined>(
      initialSelectedId,
    );
    const [expandedItems, setExpandedItems] = useState<string[] | undefined>(
      initialExpandedItems,
    );

    const selectItem = useCallback((id: string) => setSelectedId(id), []);

    const handleExpand = useCallback((id: string) => {
      setExpandedItems((prev) =>
        prev?.includes(id)
          ? prev.filter((item) => item !== id)
          : [...(prev ?? []), id],
      );
    }, []);

    const expandSpecificTargetedElements = useCallback(
      (elements?: TreeViewElement[], selectId?: string) => {
        if (!elements || !selectId) return;

        const findParent = (
          currentElement: TreeViewElement,
          currentPath: string[] = [],
        ) => {
          const isSelectable = currentElement.isSelectable ?? true;
          const newPath = [...currentPath, currentElement.id];

          if (currentElement.id === selectId) {
            if (isSelectable) {
              setExpandedItems((prev) => [...(prev ?? []), ...newPath]);
            } else {
              newPath.pop();
              setExpandedItems((prev) => [...(prev ?? []), ...newPath]);
            }

            return;
          }

          if (currentElement.children?.length) {
            currentElement.children.forEach((child) => {
              findParent(child, newPath);
            });
          }
        };

        elements.forEach((element) => {
          findParent(element);
        });
      },
      [],
    );

    useEffect(() => {
      if (initialSelectedId) {
        expandSpecificTargetedElements(elements, initialSelectedId);
      }
    }, [initialSelectedId, elements]);

    const direction = dir === "rtl" ? "rtl" : "ltr";

    return (
      <TreeContext.Provider
        value={{
          selectedId,
          expandedItems,
          handleExpand,
          selectItem,
          setExpandedItems,
          indicator,
          openIcon,
          closeIcon,
          direction,
        }}
      >
        <div ref={ref} className={cn("size-full", className)} {...props}>
          <ScrollShadow
            hideScrollBar
            className="relative h-full px-2"
            orientation="vertical"
          >
            {children}
          </ScrollShadow>
        </div>
      </TreeContext.Provider>
    );
  },
);

Tree.displayName = "Tree";

const TreeIndicator = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { direction } = useTree();

  return (
    <div
      ref={ref}
      className={cn(
        "absolute left-1.5 h-full w-px rounded-md bg-muted py-3 hover:bg-slate-300 rtl:right-1.5",
        className,
      )}
      dir={direction}
      {...props}
    />
  );
});

TreeIndicator.displayName = "TreeIndicator";

type FolderProps = {
  element: string;
  isSelectable?: boolean;
  isSelect?: boolean;
  value: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

const Folder = forwardRef<HTMLDivElement, FolderProps>(
  (
    { className, element, value, isSelectable = true, isSelect, children },
    ref,
  ) => {
    const {
      direction,
      handleExpand,
      expandedItems,
      indicator,
      openIcon,
      closeIcon,
    } = useTree();
    const isExpanded = expandedItems?.includes(value);

    return (
      <Accordion
        isCompact
        selectedKeys={expandedItems ?? []}
        onSelectionChange={(keys) => {
          const key = Array.from(keys).pop() as string;

          handleExpand(key);
        }}
      >
        <AccordionItem
          key={value}
          aria-label={element}
          title={
            <div
              ref={ref}
              className={cn(
                "flex items-center gap-1 text-sm",
                {
                  "bg-muted rounded-md": isSelect && isSelectable,
                  "cursor-pointer": isSelectable,
                  "cursor-not-allowed opacity-50": !isSelectable,
                },
                className,
              )}
            >
              {isExpanded
                ? (openIcon ?? <FolderIcon size={16} />)
                : (closeIcon ?? <FolderIcon size={16} />)}
              <span>{element}</span>
            </div>
          }
        >
          {element && indicator && <TreeIndicator aria-hidden="true" />}
          <div className="ml-5 rtl:mr-5">{children}</div>
        </AccordionItem>
      </Accordion>
    );
  },
);

Folder.displayName = "Folder";

const File = forwardRef<
  HTMLButtonElement,
  {
    value: string;
    isSelectable?: boolean;
    isSelect?: boolean;
    fileIcon?: React.ReactNode;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  (
    {
      value,
      className,
      isSelectable = true,
      isSelect,
      fileIcon,
      children,
      ...props
    },
    ref,
  ) => {
    const { direction, selectedId, selectItem } = useTree();
    const isSelected = isSelect ?? selectedId === value;

    return (
      <button
        ref={ref}
        className={cn(
          "flex w-fit items-center gap-1 rounded-md pr-1 text-sm",
          {
            "bg-muted": isSelected && isSelectable,
          },
          isSelectable ? "cursor-pointer" : "cursor-not-allowed opacity-50",
          direction === "rtl" ? "rtl" : "ltr",
          className,
        )}
        disabled={!isSelectable}
        type="button"
        onClick={() => selectItem(value)}
        {...props}
      >
        {fileIcon ?? <FileIcon size={16} />}
        {children}
      </button>
    );
  },
);

File.displayName = "File";

const CollapseButton = forwardRef<
  HTMLButtonElement,
  {
    elements: TreeViewElement[];
    expandAll?: boolean;
  } & ButtonProps
>(({ className, elements, expandAll = false, children, ...props }, ref) => {
  const { expandedItems, setExpandedItems } = useTree();

  const expendAllTree = useCallback((elements: TreeViewElement[]) => {
    const expandTree = (element: TreeViewElement) => {
      const isSelectable = element.isSelectable ?? true;

      if (isSelectable && element.children?.length) {
        setExpandedItems?.((prev) => [...(prev ?? []), element.id]);
        element.children.forEach(expandTree);
      }
    };

    elements.forEach(expandTree);
  }, []);

  const closeAll = useCallback(() => setExpandedItems?.([]), []);

  useEffect(() => {
    if (expandAll) expendAllTree(elements);
  }, [expandAll]);

  return (
    <Button
      ref={ref}
      className={cn("absolute bottom-1 right-2 h-8 w-fit p-1", className)}
      variant="ghost"
      onPress={
        expandedItems && expandedItems.length > 0
          ? closeAll
          : () => expendAllTree(elements)
      }
      {...props}
    >
      {children}
      <span className="sr-only">Toggle</span>
    </Button>
  );
});

CollapseButton.displayName = "CollapseButton";

export { CollapseButton, File, Folder, Tree, type TreeViewElement };
