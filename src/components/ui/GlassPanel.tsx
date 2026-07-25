import type { PropsWithChildren } from "react";

type GlassPanelProps = PropsWithChildren<{
  className?: string;
  labelledBy?: string;
}>;

export function GlassPanel({ children, className = "", labelledBy }: GlassPanelProps) {
  return (
    <section className={`glass-panel ${className}`.trim()} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

