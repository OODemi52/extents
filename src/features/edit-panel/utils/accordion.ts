import { AccordionProps } from "@heroui/react";

type AccordionBaseProps = Pick<
  AccordionProps,
  "allowsMultipleExpanded" | "className" | "hideSeparator" | "variant"
>;

export const EDIT_PANEL_ACCORDION_PROPS: AccordionBaseProps = {
  allowsMultipleExpanded: true,
  className: "flex flex-col gap-2 p-0",
  hideSeparator: true,
  variant: "default",
};
