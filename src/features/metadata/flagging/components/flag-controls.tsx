import { Button } from "@heroui/react";
import { FlagBannerIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { useFlagStore, type FlagState } from "../store/use-flagging-store";

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
  showClear = true,
}: FlagControlsProps) {
  const flag = useFlagStore((s) => s.flags[path] ?? "unflagged");
  const setFlag = useFlagStore((s) => s.setFlag);
  const [hovered, setHovered] = useState<FlagState | null>(null);

  const button = (
    <Button
      disableRipple
      isIconOnly
      className={`transition-colors bg-transparent !hover:bg-transparent -scale-x-100 ${className ?? ""}`}
      size={size}
      title="Flag"
      variant="light"
      onMouseEnter={() => setHovered("flagged")}
      onMouseLeave={() => setHovered(null)}
      onPress={() =>
        setFlag(path, flag === "flagged" ? "unflagged" : "flagged")
      }
    >
      <FlagBannerIcon
        className="-scale-x-100"
        weight={
          hovered === "flagged" || flag === "flagged" ? "fill" : "regular"
        }
      />
    </Button>
  );

  const clearButton = showClear ? (
    <Button
      disableRipple
      isIconOnly
      className="transition-colors bg-transparent !hover:bg-transparent -scale-x-100"
      size={size}
      title="Clear Flag"
      variant="light"
      onMouseEnter={() => setHovered("unflagged")}
      onMouseLeave={() => setHovered(null)}
      onPress={() => setFlag(path, "unflagged")}
    >
      <FlagBannerIcon
        className="-scale-x-100"
        weight={
          hovered === "unflagged" || flag === "unflagged" ? "fill" : "regular"
        }
      />
    </Button>
  ) : null;

  return (
    <>
      {button}
      {clearButton}
    </>
  );
}
