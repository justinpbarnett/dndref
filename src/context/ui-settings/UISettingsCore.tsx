import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

import type { CardSize } from "../../card-size-configs";
import { CARD_SIZE_KEY, COLOR_SCHEME_KEY } from "../../storage/keys";
import { Colors, DARK, LIGHT } from "../../theme";
import {
  COLOR_SCHEMES,
  DEFAULT_COLOR_SCHEME,
  isColorScheme,
  type ColorScheme,
} from "./color-scheme-model";
import { createCurrentUISettingsToken, loadNativeUISettings, saveUISetting } from "./persistence";

export { COLOR_SCHEMES, DEFAULT_COLOR_SCHEME, isColorScheme, type ColorScheme } from "./color-scheme-model";

export const DEFAULT_CARD_SIZE: CardSize = "M";

interface UISettingsContextType {
  cardSize: CardSize;
  setCardSize: (size: CardSize) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  resetUISettings: () => void;
}

const UISettingsContext = createContext<UISettingsContextType | null>(null);

type UISettingsCoreProviderProps = {
  children: React.ReactNode;
  initialCardSize: CardSize;
  initialColorScheme: ColorScheme;
};

export function UISettingsCoreProvider({ children, initialCardSize, initialColorScheme }: UISettingsCoreProviderProps) {
  const [cardSize, setCardSizeState] = useState<CardSize>(initialCardSize);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(initialColorScheme);

  useEffect(() => {
    loadNativeUISettings().then((settings) => {
      if (settings?.cardSize) setCardSizeState(settings.cardSize);
      if (settings?.colorScheme) setColorSchemeState(settings.colorScheme);
    });
  }, []);

  const setCardSize = useCallback((size: CardSize) => {
    const token = createCurrentUISettingsToken();
    if (token === null) return;
    setCardSizeState(size);
    saveUISetting(CARD_SIZE_KEY, size, "card size", token);
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    const token = createCurrentUISettingsToken();
    if (token === null) return;
    setColorSchemeState(scheme);
    saveUISetting(COLOR_SCHEME_KEY, scheme, "color scheme", token);
  }, []);

  const resetUISettings = useCallback(() => {
    setCardSizeState(DEFAULT_CARD_SIZE);
    setColorSchemeState(DEFAULT_COLOR_SCHEME);
  }, []);

  return (
    <UISettingsContext.Provider value={{ cardSize, setCardSize, colorScheme, setColorScheme, resetUISettings }}>
      {children}
    </UISettingsContext.Provider>
  );
}

export function useUISettings() {
  const ctx = useContext(UISettingsContext);
  if (!ctx) throw new Error("useUISettings must be used within UISettingsProvider");
  return ctx;
}

export function useColors(): Colors {
  const ctx = useContext(UISettingsContext);
  const systemScheme = useColorScheme();
  const scheme = ctx?.colorScheme ?? "dark";
  if (scheme === "light") return LIGHT;
  if (scheme === "dark") return DARK;
  return systemScheme === "light" ? LIGHT : DARK;
}
