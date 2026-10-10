import { Card } from "@heroui/react";
import {
  EqualsIcon,
  GreaterThanOrEqualIcon,
  LessThanOrEqualIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button, ButtonGroup } from "@heroui/react";
import { StarIcon } from "@phosphor-icons/react/dist/ssr";

import { useFilterStore } from "../../stores/filter-store";

import { RatingValue } from "@/types/file-annotations";

const STAR_VALUES: RatingValue[] = [1, 2, 3, 4, 5];
const COMPARISON_OPERATION = ["gte", "lte", "eq"] as const;

export function RatingFilter() {
  const rating = useFilterStore((state) => state.rating);
  const setRating = useFilterStore((state) => state.setRating);

  const currentOperation: (typeof COMPARISON_OPERATION)[number] =
    rating?.operation ?? "gte";
  const handleToggleOperation = () => {
    const latest = useFilterStore.getState().rating;
    const latestOp = latest?.operation ?? "gte";
    const nextOp =
      COMPARISON_OPERATION[
        (COMPARISON_OPERATION.indexOf(latestOp) + 1) %
          COMPARISON_OPERATION.length
      ];

    setRating({ operation: nextOp, value: latest?.value ?? 0 });
  };

  const handleSelectRating = (value: RatingValue) => {
    const latest = useFilterStore.getState().rating;

    if (latest && latest.value === value) {
      setRating(null);

      return;
    }

    setRating({ operation: latest?.operation ?? "gte", value });
  };

  const renderOperationIcon = () => {
    if (currentOperation === "eq") return <EqualsIcon />;
    if (currentOperation === "lte") return <LessThanOrEqualIcon />;

    return <GreaterThanOrEqualIcon />;
  };

  const operationLabel =
    currentOperation === "gte"
      ? "Rating is at least"
      : currentOperation === "lte"
        ? "Rating is at most"
        : "Rating equals";

  return (
    <Card className="editor-control-surface flex flex-row items-center gap-1 rounded-[16px] p-1 shadow-none">
      <Button
        isIconOnly
        aria-label={`${operationLabel}. Change comparison`}
        className="editor-focus-ring h-7 w-7 min-w-7 rounded-xl bg-transparent text-zinc-400 hover:bg-white/[0.055]"
        size="sm"
        variant="ghost"
        onPress={handleToggleOperation}
      >
        {renderOperationIcon()}
      </Button>
      <ButtonGroup aria-label="Rating value" className="gap-0">
        {STAR_VALUES.map((value) => (
          <Button
            key={value}
            isIconOnly
            aria-label={`${value} star${value > 1 ? "s" : ""}`}
            aria-pressed={rating?.value === value}
            className={`editor-focus-ring h-7 w-6 min-w-6 rounded-xl bg-transparent px-0 hover:bg-white/[0.055] ${
              rating?.value === value ? "text-zinc-100" : "text-zinc-500"
            }`}
            size="sm"
            variant="ghost"
            onPress={() => handleSelectRating(value)}
          >
            <StarIcon
              className="scale-x-[-1]"
              size={14}
              weight={rating && rating.value >= value ? "fill" : "regular"}
            />
          </Button>
        ))}
      </ButtonGroup>
    </Card>
  );
}
