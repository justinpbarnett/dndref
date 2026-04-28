import React from "react";

import { isCardSize, type CardSize } from "../reference-card-layout";
import { CARD_SIZE_KEY, COLOR_SCHEME_KEY } from "../storage/keys";
import {
  COLOR_SCHEMES,
  DEFAULT_CARD_SIZE,
  DEFAULT_COLOR_SCHEME,
  UISettingsCoreProvider,
  isColorScheme,
  useColors,
  useUISettings,
  type ColorScheme,
} from "./ui-settings/UISettingsCore";

export { CARD_SIZE_CONFIGS } from "../card-size-configs";
export type { CardSizeConfig } from "../card-size-configs";
export { CARD_SIZES } from "../reference-card-layout";
export type { CardSize } from "../reference-card-layout";
export {
  COLOR_SCHEMES,
  DEFAULT_CARD_SIZE,
  DEFAULT_COLOR_SCHEME,
  isColorScheme,
  useColors,
  useUISettings,
  type ColorScheme,
};

// Read synchronously from localStorage on web so the first render matches
// the stored preference -- avoids SSR/client hydration mismatch.
function readStoredSetting<T>(key: string, isValue: (value: unknown) => value is T, defaultValue: T): T {
  try {
    const value = typeof window === "undefined" ? null : window.localStorage.getItem(key);
    if (isValue(value)) return value;
  } catch {}
  return defaultValue;
}

export function UISettingsProvider({ children }: { children: React.ReactNode }) {
  const initialCardSize = readStoredSetting(CARD_SIZE_KEY, isCardSize, DEFAULT_CARD_SIZE);
  const initialColorScheme = readStoredSetting(COLOR_SCHEME_KEY, isColorScheme, DEFAULT_COLOR_SCHEME);

  return (
    <UISettingsCoreProvider initialCardSize={initialCardSize} initialColorScheme={initialColorScheme}>
      {children}
    </UISettingsCoreProvider>
  );
}
