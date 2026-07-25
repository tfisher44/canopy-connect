import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { THEME_LABELS, isColorMode, isThemeName } from "../../theme/themes";
import type { ColorMode, ThemeName } from "../../theme/themes";

type ThemeControlsProps = {
  colorMode: ColorMode;
  activeTheme: ThemeName;
  themeOptions: readonly ThemeName[];
  colorModeOptions: readonly ColorMode[];
  onThemeChange: (theme: ThemeName) => void;
  onColorModeChange: (mode: ColorMode) => void;
};

const THEME_ICONS: Record<ThemeName, string> = {
  aurora: "🌌",
  "canopy-dusk": "🌲",
  "sunset-neon": "🌇",
  "midnight-bloom": "🌙",
  "ember-mist": "🔥",
  "verdant-glow": "🌿",
};

export function ThemeControls({
  colorMode,
  activeTheme,
  themeOptions,
  colorModeOptions,
  onThemeChange,
  onColorModeChange,
}: ThemeControlsProps) {
  return (
    <>
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
            {`${THEME_ICONS[theme]} ${THEME_LABELS[theme]}`}
          </option>
        ))}
      </select>
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
    </>
  );
}
