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
    <Card className="p-2 rounded-[16px] border border-zinc-700/50 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] bg-[rgba(30,30,30,0.99)] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2">
        <ButtonGroup className="gap-1">
          <Button
            disableRipple
            isIconOnly
            className="!min-w-7 !w-7 !h-7 px-0"
            variant="light"
            onPress={() => toggleFlag("picked")}
          >
            <FlagApproveIcon
              hovered={false}
              overlaySize={6}
              size={18}
              state={activeFlags.includes("picked") ? "picked" : "idle"}
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
