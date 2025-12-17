import { Button, ButtonGroup } from "@heroui/button";
import { Card } from "@heroui/card";

import { useFilterStore } from "../../stores/filter-store";

import {
  FlagApproveIcon,
  FlagRejectIcon,
  FlagNeutralIcon,
} from "@/components/icons/flag-icons";
import { FlagValue } from "@/types/file-annotations";

export function FlagFilter() {
  const activeFlags = useFilterStore((s) => s.flags);
  const setFlags = useFilterStore((s) => s.setFlags);

  const toggleFlag = (flag: FlagValue) => {
    if (activeFlags.includes(flag)) {
      setFlags(activeFlags.filter((f) => f !== flag));
    } else {
      setFlags([...activeFlags, flag]);
    }
  };

  return (
    <Card className="p-2 rounded-lg bg-zinc-800 border-2 border-zinc-700">
      <div className="flex items-center gap-2">
        <ButtonGroup className="gap-1">
          <Button
            disableRipple
            isIconOnly
            className="!min-w-7 !w-7 !h-7 px-0"
            variant="light"
            onPress={() => toggleFlag("flagged")}
          >
            <FlagApproveIcon
              hovered={false}
              overlaySize={6}
              size={18}
              state={activeFlags.includes("flagged") ? "flagged" : "idle"}
            />
          </Button>

          <Button
            disableRipple
            isIconOnly
            className="!min-w-7 !w-7 !h-7 px-0"
            variant="light"
            onPress={() => toggleFlag("unflagged")}
          >
            <FlagNeutralIcon
              hovered={false}
              size={18}
              state={activeFlags.includes("unflagged") ? "unflagged" : "idle"}
            />
          </Button>

          <Button
            disableRipple
            isIconOnly
            className="!min-w-7 !w-7 !h-7 px-0"
            variant="light"
            onPress={() => toggleFlag("rejected")}
          >
            <FlagRejectIcon
              hovered={false}
              overlaySize={6}
              size={18}
              state={activeFlags.includes("rejected") ? "rejected" : "idle"}
            />
          </Button>
        </ButtonGroup>
      </div>
    </Card>
  );
}
