export const COLOR_SCHEMES = ["system", "dark", "light"] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export const DEFAULT_COLOR_SCHEME: ColorScheme = "dark";

export const isColorScheme = (value: unknown): value is ColorScheme =>
  typeof value === "string" && (COLOR_SCHEMES as readonly string[]).includes(value);
