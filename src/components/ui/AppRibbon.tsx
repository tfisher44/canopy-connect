import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { THEME_LABELS, isColorMode, isThemeName } from "../../theme/themes";
import type { ColorMode, ThemeName } from "../../theme/themes";

type AppRibbonProps = {
  title: string;
  subtitle?: string;
  colorMode: ColorMode;
  activeTheme: ThemeName;
  themeOptions: readonly ThemeName[];
  colorModeOptions: readonly ColorMode[];
  onThemeChange: (theme: ThemeName) => void;
  onColorModeChange: (mode: ColorMode) => void;
};

export function AppRibbon({
  title,
  subtitle,
  colorMode,
  activeTheme,
  themeOptions,
  colorModeOptions,
  onThemeChange,
  onColorModeChange,
}: AppRibbonProps) {
  return (
    <header className="app-ribbon" role="banner">
      <div className="app-ribbon__inner">
        <div className="app-ribbon__brand">
          <h1 className="app-ribbon__title">{title}</h1>
          {subtitle ? <p className="app-ribbon__subtitle">{subtitle}</p> : null}
        </div>
        <div className="app-ribbon__meta">
          <label className="theme-switcher theme-switcher--compact" htmlFor="theme-switcher-select">
            <span className="theme-switcher__icon" aria-hidden="true">
              🎨
            </span>
            <select
              id="theme-switcher-select"
              className="theme-switcher__select"
              aria-label="Theme"
              value={activeTheme}
              onChange={(event) => {
                const nextTheme = event.target.value;
                if (isThemeName(nextTheme)) {
                  onThemeChange(nextTheme);
                }
              }}
            >
              {themeOptions.map((theme) => (
                <option key={theme} value={theme}>
                  {THEME_LABELS[theme]}
                </option>
              ))}
            </select>
          </label>
          <div className="theme-switcher theme-switcher--compact" aria-label="Color mode switch">
            <ToggleGroup.Root
              type="single"
              className="mode-toggle"
              value={colorMode}
              onValueChange={(nextMode) => {
                if (isColorMode(nextMode)) {
                  onColorModeChange(nextMode);
                }
              }}
              aria-label="Color mode"
            >
              {colorModeOptions.map((option) => (
                <ToggleGroup.Item
                  key={option}
                  className="mode-toggle__item"
                  value={option}
                  aria-label={option === "dark" ? "Dark mode" : "Light mode"}
                  title={option === "dark" ? "Dark mode" : "Light mode"}
                >
                  {option === "dark" ? "☾" : "☀︎"}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          </div>
        </div>
      </div>
    </header>
  );
}
