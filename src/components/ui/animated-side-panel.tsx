import type { ReactNode } from "react";

import { motion, type Transition } from "framer-motion";

import { cn } from "@/lib/cn";
import { useWorkspaceWidthTransitionReporter } from "@/components/ui/workspace-width-transition";

const SIDE_PANEL_TRANSITION: Transition = {
  duration: 0.26,
  ease: [0.4, 0, 0.2, 1],
};

type AnimatedSidePanelProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  motionEnabled?: boolean;
  open: boolean;
  side: "left" | "right";
  width: number;
};

export function AnimatedSidePanel({
  children,
  className,
  contentClassName,
  motionEnabled = true,
  open,
  side,
  width,
}: AnimatedSidePanelProps) {
  const transition = motionEnabled ? SIDE_PANEL_TRANSITION : { duration: 0 };
  const widthTransition = useWorkspaceWidthTransitionReporter(motionEnabled);

  return (
    <motion.div
      animate={{ width: open ? width : 0 }}
      aria-hidden={!open}
      className={cn(
        "relative h-full shrink-0 overflow-hidden [contain:layout_paint]",
        open ? "pointer-events-auto" : "pointer-events-none",
        className,
      )}
      initial={false}
      transition={transition}
      onAnimationComplete={widthTransition.complete}
      onAnimationStart={widthTransition.begin}
    >
      <motion.div
        animate={{
          opacity: open ? 1 : 0,
          x: open ? 0 : side === "left" ? -16 : 16,
        }}
        className={cn(
          "absolute inset-y-0",
          side === "left" ? "left-0" : "right-0",
          contentClassName,
        )}
        inert={!open || undefined}
        initial={false}
        style={{ width }}
        transition={transition}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
