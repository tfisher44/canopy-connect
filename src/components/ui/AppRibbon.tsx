import type { ReactNode } from "react";

type AppRibbonProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function AppRibbon({
  title,
  subtitle,
  action,
}: AppRibbonProps) {
  return (
    <header className="app-ribbon" role="banner">
      <div className="app-ribbon__inner">
        <div className="app-ribbon__brand">
          <h1 className="app-ribbon__title">{title}</h1>
          {subtitle ? <p className="app-ribbon__subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div className="app-ribbon__meta">{action}</div> : null}
      </div>
    </header>
  );
}
