import type { ReactNode } from "react";

export const InspectorSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section>
    <div className="mb-2 text-sm text-zinc-300">{title}</div>
    <div className="space-y-2">{children}</div>
  </section>
);
