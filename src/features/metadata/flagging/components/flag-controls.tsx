import { Button, ButtonGroup } from "@heroui/button";
import { useState } from "react";

import { useFlagStore } from "../store/use-flagging-store";

import { FlagApproveIcon, FlagRejectIcon } from "@/components/icons/flag-icons";
import { FlagValue } from "@/types/file-annotations";

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
  const [hovered, setHovered] = useState<FlagValue | null>(null);

  const chipClass =
    "!min-w-5 !w-5 !h-5 px-0 transition-colors !hover:bg-transparent";
  const activeBg = (key: FlagValue) => {
    if (key === "flagged") return "#16a34a";
    if (key === "rejected") return "#ef4444";

    return "transparent";
  };
  const chipStyle = (key: FlagValue) => ({
    backgroundColor:
      flag === key
        ? activeBg(key)
        : hovered === key
          ? "#ffffff26"
          : "transparent",
    borderRadius: "6px",
  });

  return (
    <ButtonGroup className={`${className ?? ""} gap-0 z-30`}>
      {showClear ? (
        <Button
          disableRipple
          isIconOnly
          className={chipClass}
          size={size}
          style={chipStyle("unflagged")}
          title="Clear Flag"
          variant="light"
          onMouseEnter={() => setHovered("unflagged")}
          onMouseLeave={() => setHovered(null)}
          onPress={() => setFlag(path, "unflagged")}
        >
          <FlagApproveIcon
            hovered={hovered === "unflagged"}
            overlaySize={5}
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
        style={chipStyle("rejected")}
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
          overlaySize={5}
          size={20}
          state={flag === "rejected" ? "rejected" : "idle"}
        />
      </Button>

      <Button
        disableRipple
        isIconOnly
        className={chipClass}
        size={size}
        style={chipStyle("flagged")}
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
          overlaySize={5}
          size={20}
          state={flag === "flagged" ? "flagged" : "idle"}
        />
      </Button>
    </ButtonGroup>
  );
}
