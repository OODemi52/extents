import { useId, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

import { FilterMenuBar } from "@/features/filter/components/menu-bar/menu-bar";

const TAB_HEIGHT = 50;
const TAB_INSET = 24;
const TAB_RADIUS = 12;
const COLLAPSED_TAB_WIDTH = 160;

function tabContour(width: number, progress: number, baseline: number) {
  const closedInset = Math.max(TAB_INSET, (width - COLLAPSED_TAB_WIDTH) / 2);
  const left = closedInset + (TAB_INSET - closedInset) * progress;
  const right = width - left;
  const height = Math.max(baseline, TAB_HEIGHT * progress - baseline);
  const radius = TAB_RADIUS * progress;

  // The open contour omits a top stroke where the tab joins the shell.
  return `M ${left - radius} ${baseline}
    Q ${left} ${baseline} ${left} ${baseline + radius}
    L ${left} ${height - radius}
    Q ${left} ${height} ${left + radius} ${height}
    L ${right - radius} ${height}
    Q ${right} ${height} ${right} ${height - radius}
    L ${right} ${baseline + radius}
    Q ${right} ${baseline} ${right + radius} ${baseline}`;
}

export function FilterTab({ open }: { open: boolean }) {
  const bevelClipId = useId();
  const controlsRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const reveal = useSpring(open ? 1 : 0, {
    stiffness: 350,
    damping: 24,
    mass: 0.75,
    restDelta: 0.005,
    restSpeed: 0.05,
  });
  const height = useTransform(
    reveal,
    (value) => TAB_HEIGHT * Math.max(0, value),
  );
  const fill = useTransform(reveal, (value) =>
    tabContour(width, Math.max(0, value), 0),
  );
  const outline = useTransform(reveal, (value) =>
    // Align the stroke's center with the inset's one-pixel top border.
    tabContour(width, Math.max(0, value), 0.5),
  );
  const clipPath = useTransform(reveal, (value) => {
    const progress = Math.max(0, value);
    const closedInset = Math.max(TAB_INSET, (width - COLLAPSED_TAB_WIDTH) / 2);
    const inset = closedInset + (TAB_INSET - closedInset) * progress;
    const bottom = TAB_HEIGHT * (1 - progress);
    const radius = TAB_RADIUS * progress;

    return `inset(0px ${inset}px ${bottom}px ${inset}px round 0px 0px ${radius}px ${radius}px)`;
  });

  useLayoutEffect(() => {
    if (reducedMotion) reveal.jump(open ? 1 : 0);
    else reveal.set(open ? 1 : 0);
  }, [open, reducedMotion, reveal]);

  useLayoutEffect(() => {
    const controls = controlsRef.current;

    if (!controls) return;

    setWidth(controls.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      const nextWidth =
        entry.borderBoxSize[0]?.inlineSize ??
        controls.getBoundingClientRect().width;

      setWidth((previous) =>
        Math.abs(previous - nextWidth) < 0.5 ? previous : nextWidth,
      );
    });

    observer.observe(controls);

    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      aria-hidden={!open}
      className="next-shell-filters"
      data-filter-ui="true"
      data-open={open || undefined}
      id="next-photo-filters"
      inert={!open || undefined}
      style={{ height }}
    >
      <svg
        aria-hidden="true"
        className="next-filter-contour"
        focusable="false"
        height={TAB_HEIGHT}
        viewBox={`0 0 ${Math.max(1, width)} ${TAB_HEIGHT}`}
      >
        <defs>
          <clipPath clipPathUnits="userSpaceOnUse" id={bevelClipId}>
            <motion.path d={fill} />
          </clipPath>
        </defs>
        <motion.path d={fill} fill="var(--next-chrome)" />
        {/* Clip offset strokes into the surface, matching CSS inset shadows. */}
        <g clipPath={`url(#${bevelClipId})`}>
          <motion.path
            className="next-filter-bevel-highlight"
            d={outline}
            fill="none"
            stroke="var(--next-bevel-highlight)"
            strokeWidth={1}
            transform="translate(1 1)"
            vectorEffect="non-scaling-stroke"
          />
          <motion.path
            className="next-filter-bevel-shadow"
            d={outline}
            fill="none"
            stroke="var(--next-bevel-shadow)"
            strokeWidth={1}
            transform="translate(-1 -1)"
            vectorEffect="non-scaling-stroke"
          />
        </g>
        <motion.path
          d={outline}
          fill="none"
          stroke="var(--next-inset-line)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <motion.div
        ref={controlsRef}
        className="next-filter-controls"
        style={{ clipPath }}
      >
        <FilterMenuBar />
      </motion.div>
    </motion.div>
  );
}
