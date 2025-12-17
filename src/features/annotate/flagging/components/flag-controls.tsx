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
  const setFlag = useFlagStore((state) => state.setFlag);
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
          setFlag(path, flag === "rejected" ? "unflagged" : "rejected")
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
        title={flag === "flagged" ? "Clear flag" : "Flag"}
        variant="light"
        onMouseEnter={() => setHovered("flagged")}
        onMouseLeave={() => setHovered(null)}
        onPress={() =>
          setFlag(path, flag === "flagged" ? "unflagged" : "flagged")
        }
      >
        <FlagApproveIcon
          hovered={hovered === "flagged"}
          overlaySize={5}
          size={20}
          state={flag === "flagged" ? "flagged" : "idle"}
        />
      </Button>
    </ButtonGroup>
  );
}
