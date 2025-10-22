import { createContext, useCallback, useContext, useState } from "react";

export type TreeViewElement = {
  id: string;
  name: string;
  children?: TreeViewElement[];
};

// The context will pass down selection state and icons
type TreeContextProps = {
  selectedId: string | undefined;
  selectItem: (id: string) => void;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
};

const TreeContext = createContext<TreeContextProps | null>(null);

export const useTree = () => {
  const context = useContext(TreeContext);

  if (!context) {
    throw new Error("useTree must be used within a TreeProvider");
  }

  return context;
};

type TreeProviderProps = {
  children: React.ReactNode;
  initialSelectedId?: string;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
};

export const TreeProvider = ({
  children,
  initialSelectedId,
  openIcon,
  closeIcon,
}: TreeProviderProps) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(
    initialSelectedId,
  );

  const selectItem = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  return (
    <TreeContext.Provider
      value={{
        selectedId,
        selectItem,
        openIcon,
        closeIcon,
      }}
    >
      {children}
    </TreeContext.Provider>
  );
};
