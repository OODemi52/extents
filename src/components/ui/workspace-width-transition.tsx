import type { ReactNode } from "react";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

type WidthTransitionListener = (active: boolean) => void;

type WorkspaceWidthTransitionController = {
  begin: (source: symbol) => void;
  complete: (source: symbol) => void;
  subscribe: (listener: WidthTransitionListener) => () => void;
};

const WorkspaceWidthTransitionContext =
  createContext<WorkspaceWidthTransitionController | null>(null);

export function WorkspaceWidthTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const activeSourcesRef = useRef(new Set<symbol>());
  const listenersRef = useRef(new Set<WidthTransitionListener>());

  const notify = useCallback((active: boolean) => {
    listenersRef.current.forEach((listener) => listener(active));
  }, []);

  const controller = useMemo<WorkspaceWidthTransitionController>(
    () => ({
      begin: (source) => {
        const wasActive = activeSourcesRef.current.size > 0;

        activeSourcesRef.current.add(source);

        if (!wasActive) {
          notify(true);
        }
      },
      complete: (source) => {
        const removed = activeSourcesRef.current.delete(source);

        if (removed && activeSourcesRef.current.size === 0) {
          notify(false);
        }
      },
      subscribe: (listener) => {
        listenersRef.current.add(listener);

        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [notify],
  );

  return (
    <WorkspaceWidthTransitionContext.Provider value={controller}>
      {children}
    </WorkspaceWidthTransitionContext.Provider>
  );
}

export function useWorkspaceWidthTransitionReporter(enabled: boolean) {
  const controller = useContext(WorkspaceWidthTransitionContext);
  const sourceRef = useRef(Symbol("workspace-width-transition"));

  const begin = useCallback(() => {
    if (enabled) {
      controller?.begin(sourceRef.current);
    }
  }, [controller, enabled]);

  const complete = useCallback(() => {
    controller?.complete(sourceRef.current);
  }, [controller]);

  useEffect(() => {
    if (!enabled) {
      complete();
    }

    return complete;
  }, [complete, enabled]);

  return { begin, complete };
}

export function useWorkspaceWidthTransitionSubscription(
  listener: WidthTransitionListener,
) {
  const controller = useContext(WorkspaceWidthTransitionContext);

  useEffect(() => controller?.subscribe(listener), [controller, listener]);
}
