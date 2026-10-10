import type { ReactNode } from "react";

import { Button } from "@heroui/react";
import {
  CaretRightIcon,
  FolderOpenIcon,
  ImageSquareIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/cn";

type EmptyStateAction = {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
};

type EmptyStateProps = {
  title: string;
  description?: string;
  announcement?: "alert" | "status";
  action?: EmptyStateAction;
  className?: string;
  compact?: boolean;
  graphic?: ReactNode;
};

export function PhotoWorkflowGraphic() {
  const stepClass =
    "flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-500";

  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-2">
      <span className={stepClass}>
        <FolderOpenIcon size={21} weight="duotone" />
      </span>
      <CaretRightIcon className="text-zinc-700" size={12} weight="bold" />
      <span className={stepClass}>
        <SquaresFourIcon size={21} weight="duotone" />
      </span>
      <CaretRightIcon className="text-zinc-700" size={12} weight="bold" />
      <span
        className={cn(
          stepClass,
          "border-blue-500/25 bg-blue-500/[0.07] text-blue-400/80",
        )}
      >
        <ImageSquareIcon size={21} weight="duotone" />
      </span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  announcement,
  action,
  className,
  compact = false,
  graphic,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-5" : "gap-3 px-6 py-8",
        className,
      )}
      role={announcement}
    >
      {graphic ? (
        <div className={compact ? "mb-1" : "mb-2"}>{graphic}</div>
      ) : null}
      <div className="max-w-sm space-y-1.5">
        <h2
          className={cn(
            "font-semibold text-zinc-200",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "text-pretty text-zinc-400",
              compact ? "text-[11px] leading-4" : "text-xs leading-5",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Button
          className="editor-focus-ring mt-1 h-8 rounded-xl border border-zinc-700/50 bg-zinc-700/70 px-3 text-xs font-medium text-zinc-100 hover:bg-zinc-600/70"
          size="sm"
          variant="secondary"
          onPress={action.onPress}
        >
          {action.icon}
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
