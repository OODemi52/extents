import { Button, ButtonGroup } from "@heroui/react";
import { useState } from "react";

import { useFlagStore } from "../store/use-flagging-store";

import { FlagApproveIcon, FlagRejectIcon } from "@/components/icons/flag-icons";
import { FlagValue } from "@/types/file-annotations";

interface FlagControlsProps {
  path: string;
  isKeyboardAccessible: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function FlagControls({
  path,
  isKeyboardAccessible,
  className,
  size = "sm",
}: FlagControlsProps) {
  const flag = useFlagStore((state) => state.flags[path] ?? "unflagged");
  const setFlags = useFlagStore((state) => state.setFlags);
  const [hovered, setHovered] = useState<FlagValue | null>(null);

  return (
    <ButtonGroup
      aria-label="Photo flag"
      className={`${className ?? ""} z-30 gap-0`}
      data-gallery-annotation-control="true"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Button
        isIconOnly
        aria-label={flag === "rejected" ? "Clear reject flag" : "Reject photo"}
        aria-pressed={flag === "rejected"}
        className="editor-focus-ring h-7 w-7 min-w-7 rounded-xl bg-transparent px-0 transition-opacity hover:bg-white/[0.055]"
        size={size}
        excludeFromTabOrder={!isKeyboardAccessible}
        variant="ghost"
        onMouseEnter={() => setHovered("rejected")}
        onMouseLeave={() => setHovered(null)}
        onPress={() =>
          setFlags([
            { path, value: flag === "rejected" ? "unflagged" : "rejected" },
          ])
        }
      >
        <FlagRejectIcon
          hovered={hovered === "rejected"}
          overlaySize={5}
          size={20}
          state={flag === "rejected" ? "rejected" : "idle"}
        />
      </Button>

      <Button
        isIconOnly
        aria-label={flag === "picked" ? "Clear pick flag" : "Pick photo"}
        aria-pressed={flag === "picked"}
        className="editor-focus-ring h-7 w-7 min-w-7 rounded-xl bg-transparent px-0 transition-opacity hover:bg-white/[0.055]"
        size={size}
        excludeFromTabOrder={!isKeyboardAccessible}
        variant="ghost"
        onMouseEnter={() => setHovered("picked")}
        onMouseLeave={() => setHovered(null)}
        onPress={() =>
          setFlags([
            { path, value: flag === "picked" ? "unflagged" : "picked" },
          ])
        }
      >
        <FlagApproveIcon
          hovered={hovered === "picked"}
          overlaySize={5}
          size={20}
          state={flag === "picked" ? "picked" : "idle"}
        />
      </Button>
    </ButtonGroup>
  );
}
