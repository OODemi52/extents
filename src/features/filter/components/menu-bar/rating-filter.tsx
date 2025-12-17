import { Card } from "@heroui/card";
import {
  EqualsIcon,
  GreaterThanOrEqualIcon,
  LessThanOrEqualIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button, ButtonGroup } from "@heroui/button";
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

  return (
    <Card className="flex flex-row items-center gap-x-2 p-[6px] rounded-lg bg-zinc-800 border-2 border-zinc-700">
      <Button
        isIconOnly
        radius="full"
        size="sm"
        onPress={handleToggleOperation}
      >
        {renderOperationIcon()}
      </Button>
      <ButtonGroup className="gap-0">
        {STAR_VALUES.map((value) => (
          <Button
            key={value}
            disableRipple
            isIconOnly
            className={`!min-w-4 !w-4 bg-transparent !hover:bg-transparent ${
              rating?.value === value ? "!text-white" : ""
            }`}
            size="sm"
            title={`${value} Star${value > 1 ? "s" : ""}`}
            variant="light"
            onPress={() => handleSelectRating(value)}
          >
            <StarIcon
              className="scale-x-[-1]"
              size={12}
              weight={rating && rating.value >= value ? "fill" : "regular"}
            />
          </Button>
        ))}
      </ButtonGroup>
    </Card>
  );
}
