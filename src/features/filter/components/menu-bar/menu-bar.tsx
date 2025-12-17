import { EditedFilter } from "./edited-filter";
import { FlagFilter } from "./flag-filter";
import { RatingFilter } from "./rating-filter";

export function FilterMenuBar() {
  return (
    <div className="w-full flex items-center py-1 px-4 gap-4">
      <RatingFilter />
      <FlagFilter />
      <EditedFilter />
    </div>
  );
}
