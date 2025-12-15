import { Button, ButtonGroup } from "@heroui/react";
import { StarIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { useRatingStore, type RatingValue } from "../store/use-rating-store";

const STAR_VALUES: RatingValue[] = [1, 2, 3, 4, 5];

interface RatingStarsProps {
  path: string;
  size?: "sm" | "md";
  className?: string;
  compact?: boolean;
}

export function RatingStars({
  path,
  size = "sm",
  className,
  compact = false,
}: RatingStarsProps) {
  const rating = useRatingStore((s) => s.ratings[path] ?? 0);
  const setRating = useRatingStore((s) => s.setRating);
  const [hoveredStar, setHoveredStar] = useState<RatingValue | null>(null);
  const effectiveRating =
    hoveredStar !== null ? Math.max(rating, hoveredStar) : rating;
  const buttonSizeClass = compact ? "!min-w-3 !w-3 !h-3" : "!min-w-4 !w-4";
  const iconSize = compact ? 12 : undefined;

  return (
    <ButtonGroup className={`${className ?? ""} ${compact ? "!gap-0" : ""}`}>
      {STAR_VALUES.map((value) => (
        <Button
          key={value}
          disableRipple
          isIconOnly
          className={`${buttonSizeClass} bg-transparent !hover:bg-transparent`}
          size={size}
          title={`${value} Star`}
          variant="light"
          onMouseEnter={() => setHoveredStar(value)}
          onMouseLeave={() => setHoveredStar(null)}
          onPress={() => setRating(path, value)}
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
