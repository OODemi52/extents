import { Button, ButtonGroup } from "@heroui/react";
import { useState } from "react";

import { useFlagStore, type FlagState } from "../store/use-flagging-store";

import { FlagApproveIcon, FlagRejectIcon } from "@/components/icons/flag-icons";

interface FlagControlsProps {
  path: string;
  className?: string;
  size?: "sm" | "md";
  showClear?: boolean;
}

export function FlagControls({
  path,
  className,
  size = "sm",
  showClear = false,
}: FlagControlsProps) {
  const flag = useFlagStore((s) => s.flags[path] ?? "unflagged");
  const setFlag = useFlagStore((s) => s.setFlag);
  const [hovered, setHovered] = useState<FlagState | null>(null);

  const chipClass =
    "!min-w-5 !w-5 !h-5 px-0 transition-colors !hover:bg-transparent";

  return (
    <ButtonGroup className={`${className ?? ""} gap-0 z-30`}>
      {showClear ? (
        <Button
          disableRipple
          isIconOnly
          className={chipClass}
          size={size}
          title="Clear Flag"
          variant="light"
          onMouseEnter={() => setHovered("unflagged")}
          onMouseLeave={() => setHovered(null)}
          onPress={() => setFlag(path, "unflagged")}
        >
          <FlagApproveIcon
            hovered={hovered === "unflagged"}
            overlaySize={7}
            size={20}
            state="idle"
          />
        </Button>
      ) : null}

      <Button
        disableRipple
        isIconOnly
        className={chipClass}
        size={size}
        title="Reject"
        variant="light"
        onMouseEnter={() => setHovered("rejected")}
        onMouseLeave={() => setHovered(null)}
        onPress={() =>
          setFlag(path, flag === "rejected" ? "unflagged" : "rejected")
        }
      >
        <FlagRejectIcon
          hovered={hovered === "rejected"}
          overlaySize={7}
          size={20}
          state={flag === "rejected" ? "rejected" : "idle"}
        />
      </Button>

      <Button
        disableRipple
        isIconOnly
        className={chipClass}
        size={size}
        title="Flag"
        variant="light"
        onMouseEnter={() => setHovered("flagged")}
        onMouseLeave={() => setHovered(null)}
        onPress={() =>
          setFlag(path, flag === "flagged" ? "unflagged" : "flagged")
        }
      >
        <FlagApproveIcon
          hovered={hovered === "flagged"}
          overlaySize={7}
          size={20}
          state={flag === "flagged" ? "flagged" : "idle"}
        />
      </Button>
    </ButtonGroup>
  );
}
