import { AccordionProps } from "@heroui/accordion";

type AccordionBaseProps = Pick<
  AccordionProps,
  "isCompact" | "className" | "motionProps" | "selectionMode" | "variant"
>;

export const EDIT_PANEL_ACCORDION_PROPS: AccordionBaseProps = {
  isCompact: true,
  className: "p-0",
  motionProps: {
    variants: {
      enter: {
        y: 0,
        opacity: 1,
        height: "auto",
        overflowY: "unset",
        transition: {
          height: {
            type: "spring",
            stiffness: 500,
            damping: 30,
            duration: 1,
          },
          opacity: { ease: "easeInOut", duration: 1 },
        },
      },
      exit: {
        y: -10,
        opacity: 0,
        height: 0,
        overflowY: "hidden",
        transition: {
          height: { ease: "easeInOut", duration: 0.25 },
          opacity: { ease: "easeInOut", duration: 0.3 },
        },
      },
    },
  },
  selectionMode: "multiple",
  variant: "splitted",
};
