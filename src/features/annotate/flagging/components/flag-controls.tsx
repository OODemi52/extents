import { Button, ButtonGroup } from "@heroui/button";
import { useState } from "react";

import { useFlagStore } from "../store/use-flagging-store";

import { FlagApproveIcon, FlagRejectIcon } from "@/components/icons/flag-icons";
import { FlagValue } from "@/types/file-annotations";

interface FlagControlsProps {
  path: string;
  className?: string;
  size?: "sm" | "md";
}

export function FlagControls({
  path,
  className,
  size = "sm",
}: FlagControlsProps) {
  const flag = useFlagStore((state) => state.flags[path] ?? "unflagged");
  const setFlags = useFlagStore((state) => state.setFlags);
  const [hovered, setHovered] = useState<FlagValue | null>(null);

  return (
    <ButtonGroup className={`${className ?? ""} gap-0 z-30`}>
      <Button
        disableRipple
        isIconOnly
        className="!min-w-7 !w-7 !h-7 px-0 transition-opacity !hover:bg-transparent"
        size={size}
        title={flag === "rejected" ? "Clear reject" : "Reject"}
        variant="light"
        onMouseEnter={() => setHovered("rejected")}
        onMouseLeave={() => setHovered(null)}
        onPress={() =>
          setFlags([
            { path, flag: flag === "rejected" ? "unflagged" : "rejected" },
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
        disableRipple
        isIconOnly
        className="!min-w-7 !w-7 !h-7 px-0 transition-opacity !hover:bg-transparent"
        size={size}
        title={flag === "picked" ? "Clear pick" : "Pick"}
        variant="light"
        onMouseEnter={() => setHovered("picked")}
        onMouseLeave={() => setHovered(null)}
        onPress={() =>
          setFlags([{ path, flag: flag === "picked" ? "unflagged" : "picked" }])
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
