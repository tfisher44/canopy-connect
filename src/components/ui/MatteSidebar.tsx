import type { PropsWithChildren } from "react";

type MatteSidebarProps = PropsWithChildren<{
  id: string;
  label: string;
}>;

export function MatteSidebar({ id, label, children }: MatteSidebarProps) {
  return (
    <aside id={id} className="runtime-shell__panel matte-sidebar" aria-label={label}>
      {children}
    </aside>
  );
}

