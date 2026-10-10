import { Button, ButtonGroup } from "@heroui/react";
import { StarIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { useRatingStore } from "../store/use-rating-store";

import { RatingValue } from "@/types/file-annotations";

const STAR_VALUES: RatingValue[] = [1, 2, 3, 4, 5];

interface RatingStarsProps {
  path: string;
  isKeyboardAccessible: boolean;
  size?: "sm" | "md";
  className?: string;
  compact?: boolean;
}

export function RatingStars({
  path,
  isKeyboardAccessible,
  size = "sm",
  className,
  compact = false,
}: RatingStarsProps) {
  const rating = useRatingStore((state) => state.ratings[path] ?? 0);
  const toggleRating = useRatingStore((state) => state.toggleRating);
  const [hoveredStar, setHoveredStar] = useState<RatingValue | null>(null);
  const effectiveRating =
    hoveredStar !== null ? Math.max(rating, hoveredStar) : rating;
  const buttonSizeClass = compact ? "h-6 w-5 min-w-5" : "h-7 w-6 min-w-6";
  const iconSize = compact ? 12 : 14;

  return (
    <ButtonGroup
      aria-label="Photo rating"
      className={`${className ?? ""} ${compact ? "!gap-0" : ""}`}
      data-gallery-annotation-control="true"
      onKeyDown={(event) => event.stopPropagation()}
    >
      {STAR_VALUES.map((value) => (
        <Button
          key={value}
          isIconOnly
          aria-label={`${value} star${value > 1 ? "s" : ""}`}
          aria-pressed={rating === value}
          className={`${buttonSizeClass} editor-focus-ring rounded-xl bg-transparent px-0 hover:bg-white/[0.055]`}
          size={size}
          excludeFromTabOrder={!isKeyboardAccessible}
          variant="ghost"
          onMouseEnter={() => setHoveredStar(value)}
          onMouseLeave={() => setHoveredStar(null)}
          onPress={() => toggleRating(path, value)}
        >
          <StarIcon
            className="scale-x-[-1]"
            size={iconSize}
            weight={effectiveRating >= value ? "fill" : "regular"}
          />
        </Button>
      ))}
    </ButtonGroup>
  );
}
