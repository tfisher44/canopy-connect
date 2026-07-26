import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import {
  COLOR_MODES,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME,
  THEMES,
  isColorMode,
  isThemeName,
} from "./themes";
import type { ColorMode, ThemeName } from "./themes";
const THEME_STORAGE_KEY = "canopy-connect-theme";
const COLOR_MODE_STORAGE_KEY = "canopy-connect-color-mode";

export type ThemeContextValue = {
  theme: ThemeName;
  colorMode: ColorMode;
  setTheme: (theme: ThemeName) => void;
  setColorMode: (mode: ColorMode) => void;
  options: readonly ThemeName[];
  colorModeOptions: readonly ColorMode[];
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): ThemeName {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeName(storedTheme)) {
    return storedTheme;
  }

  return DEFAULT_THEME;
}

function getInitialColorMode(): ColorMode {
  if (typeof window === "undefined") {
    return DEFAULT_COLOR_MODE;
  }

  const storedMode = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  if (isColorMode(storedMode)) {
    return storedMode;
  }

  return DEFAULT_COLOR_MODE;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme);
  const [colorMode, setColorMode] = useState<ColorMode>(getInitialColorMode);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", colorMode);
    document.documentElement.classList.remove("calcite-mode-light", "calcite-mode-dark");
    document.documentElement.classList.add(
      colorMode === "dark" ? "calcite-mode-dark" : "calcite-mode-light",
    );
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colorMode,
      setTheme,
      setColorMode,
      options: THEMES,
      colorModeOptions: COLOR_MODES,
    }),
    [colorMode, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
