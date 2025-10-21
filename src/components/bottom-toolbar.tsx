import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import {
  SidebarSimpleIcon,
  InfoIcon,
  SlidersIcon,
  CropIcon,
  UserCircleDashedIcon,
  EraserIcon,
  SwatchesIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";

export function BottomToolbar() {
  return (
    <footer
      className="
        flex items-center justify-between
        h-8 px-4 pb-3
        bg-[rgba(25,25,25,1)]
        text-xs text-zinc-400
        select-none
        rounded-xl
      "
    >
      {/* Left side: Left Layout Controls */}
      <div className="flex items-center">
        <Button
          isIconOnly
          className="hover:text-white bg-transparent transition-colors"
          size="sm"
        >
          <SidebarSimpleIcon size={16} />
        </Button>
      </div>

      {/* Center: status / info */}
      <div className="text-zinc-500 text-[11px] tracking-tight">
        3 images loaded — Editing:{" "}
        <span className="text-white">IMG_1024.jpg</span>
      </div>

      {/* Right side: Right Layout Controls */}
      <div className="flex items-center">
        <Button
          isDisabled
          isIconOnly
          className="hover:text-white bg-transparent transition-colors"
          size="sm"
        >
          <SparkleIcon size={16} />
        </Button>

        <Divider className="h-6" orientation="vertical" />

        <Button
          isDisabled
          isIconOnly
          className="hover:text-white bg-transparent transition-colors"
          size="sm"
        >
          <SwatchesIcon size={16} />
        </Button>
        <Button
          isIconOnly
          className="hover:text-white bg-transparent transition-colors"
          size="sm"
        >
          <SlidersIcon className="rotate-90" size={16} />
        </Button>
        <Button
          isDisabled
          isIconOnly
          className="hover:text-white bg-transparent transition-colors"
          size="sm"
        >
          <CropIcon size={16} />
        </Button>
        <Button
          isDisabled
          isIconOnly
          className="hover:text-white bg-transparent transition-colors"
          size="sm"
        >
          <EraserIcon size={16} />
        </Button>
        <Button
          isDisabled
          isIconOnly
          className="hover:text-white bg-transparent transition-colors"
          size="sm"
        >
          <UserCircleDashedIcon size={16} />
        </Button>
        <Button
          isDisabled
          isIconOnly
          className="hover:text-white bg-transparent transition-colors"
          size="sm"
        >
          <InfoIcon size={16} />
        </Button>
      </div>
    </footer>
  );
}
