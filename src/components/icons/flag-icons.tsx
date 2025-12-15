import { FlagIcon, CheckIcon, XIcon } from "@phosphor-icons/react/dist/ssr";

type FlagVisualProps = {
  state: "flagged" | "rejected" | "idle";
  hovered?: boolean;
  size?: number;
  overlaySize?: number;
};

const ACTIVE_COLORS: Record<
  Exclude<FlagVisualProps["state"], "idle">,
  string
> = {
  flagged: "#16a34a",
  rejected: "#ef4444",
};

export function FlagApproveIcon({
  state,
  hovered = false,
  size = 20,
  overlaySize,
}: FlagVisualProps) {
  const isActive = state === "flagged";
  const fillColor = isActive
    ? ACTIVE_COLORS.flagged
    : hovered
      ? "#ffffff"
      : "currentColor";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <FlagIcon
        color={fillColor}
        size={size}
        weight={isActive ? "fill" : "regular"}
      />
      <CheckIcon
        className="absolute -translate-y-[1px] translate-x-[1px]"
        color="#ffffff"
        size={overlaySize ?? 7}
        weight="bold"
      />
    </div>
  );
}

export function FlagRejectIcon({
  state,
  hovered = false,
  size = 20,
  overlaySize,
}: FlagVisualProps) {
  const isActive = state === "rejected";
  const fillColor = isActive
    ? ACTIVE_COLORS.rejected
    : hovered
      ? "#ffffff"
      : "currentColor";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <FlagIcon
        color={fillColor}
        size={size}
        weight={isActive ? "fill" : "regular"}
      />
      <XIcon
        className="absolute -translate-y-[1px] translate-x-[1px]"
        color="#ffffff"
        size={overlaySize ?? 7}
        weight="bold"
      />
    </div>
  );
}
