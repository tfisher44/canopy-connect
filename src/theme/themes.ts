export const THEMES = [
  "aurora",
  "canopy-dusk",
  "sunset-neon",
  "midnight-bloom",
  "ember-mist",
  "verdant-glow",
] as const;

export type ThemeName = (typeof THEMES)[number];
export const COLOR_MODES = ["dark", "light"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const DEFAULT_THEME: ThemeName = "verdant-glow";
export const DEFAULT_COLOR_MODE: ColorMode = "light";

export const THEME_LABELS: Record<ThemeName, string> = {
  aurora: "Aurora",
  "canopy-dusk": "Canopy Dusk",
  "sunset-neon": "Sunset Neon",
  "midnight-bloom": "Midnight Bloom",
  "ember-mist": "Ember Mist",
  "verdant-glow": "Verdant Glow",
};

export function isThemeName(value: string | null): value is ThemeName {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

export function isColorMode(value: string | null): value is ColorMode {
  return value !== null && (COLOR_MODES as readonly string[]).includes(value);
}
