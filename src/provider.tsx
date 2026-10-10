import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { createAppMenu } from "./config/menu";
import { WorkspaceWidthTransitionProvider } from "./components/ui/workspace-width-transition";

let appMenuPromise: ReturnType<typeof createAppMenu> | null = null;

function ensureAppMenu() {
  if (appMenuPromise === null || appMenuPromise === undefined) {
    appMenuPromise = createAppMenu();
  }

  return appMenuPromise;
}

export function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    void ensureAppMenu();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceWidthTransitionProvider>
        {children}
      </WorkspaceWidthTransitionProvider>
    </QueryClientProvider>
  );
}
