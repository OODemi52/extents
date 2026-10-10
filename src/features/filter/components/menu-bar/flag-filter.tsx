import { Button, ButtonGroup, Card } from "@heroui/react";

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
    <Card className="editor-control-surface rounded-[16px] p-1 shadow-none">
      <div className="flex items-center">
        <ButtonGroup aria-label="Flag status" className="gap-0.5">
          <Button
            isIconOnly
            aria-label="Show picked photos"
            aria-pressed={activeFlags.includes("picked")}
            className="editor-focus-ring h-7 w-7 min-w-7 rounded-xl bg-transparent px-0 hover:bg-white/[0.055]"
            variant="ghost"
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
            isIconOnly
            aria-label="Show unflagged photos"
            aria-pressed={activeFlags.includes("unflagged")}
            className="editor-focus-ring h-7 w-7 min-w-7 rounded-xl bg-transparent px-0 hover:bg-white/[0.055]"
            variant="ghost"
            onPress={() => toggleFlag("unflagged")}
          >
            <FlagNeutralIcon
              hovered={false}
              size={18}
              state={activeFlags.includes("unflagged") ? "unflagged" : "idle"}
            />
          </Button>

          <Button
            isIconOnly
            aria-label="Show rejected photos"
            aria-pressed={activeFlags.includes("rejected")}
            className="editor-focus-ring h-7 w-7 min-w-7 rounded-xl bg-transparent px-0 hover:bg-white/[0.055]"
            variant="ghost"
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
