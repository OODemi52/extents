import type { NavigateOptions } from "react-router-dom";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
//import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeroUIProvider } from "@heroui/system";
import { useHref, useNavigate } from "react-router-dom";

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

export function Provider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const [queryClient] = useState(() => new QueryClient());

  return (
    <HeroUIProvider navigate={navigate} useHref={useHref}>
      <QueryClientProvider client={queryClient}>
        {children}
        {/*Commented this out because it covers parts of the UI */}

        {/*<ReactQueryDevtools initialIsOpen={false} />*/}
      </QueryClientProvider>
    </HeroUIProvider>
  );
}
