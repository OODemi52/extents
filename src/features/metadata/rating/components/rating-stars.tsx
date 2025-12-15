import { Button, ButtonGroup } from "@heroui/react";
import { StarIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { useRatingStore, type RatingValue } from "../store/use-rating-store";

const STAR_VALUES: RatingValue[] = [1, 2, 3, 4, 5];

interface RatingStarsProps {
  path: string;
  size?: "sm" | "md";
  className?: string;
}

export function RatingStars({
  path,
  size = "sm",
  className,
}: RatingStarsProps) {
  const rating = useRatingStore((s) => s.ratings[path] ?? 0);
  const setRating = useRatingStore((s) => s.setRating);
  const [hoveredStar, setHoveredStar] = useState<RatingValue | null>(null);
  const effectiveRating = hoveredStar ?? rating;

  return (
    <ButtonGroup className={className}>
      {STAR_VALUES.map((value) => (
        <Button
          key={value}
          disableRipple
          isIconOnly
          className="!min-w-4 !w-4 bg-transparent !hover:bg-transparent"
          size={size}
          title={`${value} Star`}
          variant="light"
          onMouseEnter={() => setHoveredStar(value)}
          onMouseLeave={() => setHoveredStar(null)}
          onPress={() => setRating(path, value)}
        >
          <StarIcon
            className="scale-x-[-1]"
            weight={effectiveRating >= value ? "fill" : "regular"}
          />
        </Button>
      ))}
    </ButtonGroup>
  );
}
