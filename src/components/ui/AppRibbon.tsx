import type { ReactNode } from "react";

type AppRibbonProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  logoSrc?: string;
  logoAlt?: string;
};

export function AppRibbon({
  title,
  subtitle,
  action,
  logoSrc,
  logoAlt = "",
}: AppRibbonProps) {
  const hasLogo = typeof logoSrc === "string" && logoSrc.length > 0;
  const titleClassName = hasLogo
    ? "app-ribbon__title app-ribbon__title--with-logo"
    : "app-ribbon__title";
  const brandLockupClassName = hasLogo
    ? "app-ribbon__brand-lockup app-ribbon__brand-lockup--with-logo"
    : "app-ribbon__brand-lockup";
  const subtitleClassName = hasLogo
    ? "app-ribbon__subtitle app-ribbon__subtitle--with-logo"
    : "app-ribbon__subtitle";

  return (
    <header className="app-ribbon" role="banner">
      <div className="app-ribbon__inner">
        <div className="app-ribbon__brand">
          <div className={brandLockupClassName}>
            {logoSrc ? (
              <img className="app-ribbon__logo" src={logoSrc} alt={logoAlt} />
            ) : null}
            <div className="app-ribbon__brand-copy">
              <h1 className={titleClassName}>{title}</h1>
              {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
            </div>
          </div>
        </div>
        {action ? <div className="app-ribbon__meta">{action}</div> : null}
      </div>
    </header>
  );
}
