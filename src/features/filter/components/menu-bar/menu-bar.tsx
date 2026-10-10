import { EditedFilter } from "./edited-filter";
import { FlagFilter } from "./flag-filter";
import { RatingFilter } from "./rating-filter";

export function FilterMenuBar() {
  return (
    <div
      aria-label="Photo filters"
      className="flex h-12 w-full items-center gap-2 px-4 py-1"
      role="toolbar"
    >
      <RatingFilter />
      <FlagFilter />
      <EditedFilter />
    </div>
  );
}
