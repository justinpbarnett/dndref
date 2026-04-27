import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

import {
  CARD_SIZE_LAYOUT_CONFIGS,
  isCardSize,
  type CardSize,
  type CardSizeLayoutConfig,
} from '../reference-card-layout';
import {
  createAppDataWriteToken,
  getAppDataItem,
  isAppDataWriteTokenCurrent,
  setAppDataItem,
} from '../storage/app-data';
import { CARD_SIZE_KEY, COLOR_SCHEME_KEY } from '../storage/keys';
import { Colors, DARK, LIGHT } from '../theme';

export { CARD_SIZES } from '../reference-card-layout';
export type { CardSize } from '../reference-card-layout';

export const COLOR_SCHEMES = ['system', 'dark', 'light'] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export interface CardSizeConfig extends CardSizeLayoutConfig {
  fontScale: number;
}

export const CARD_SIZE_CONFIGS: Record<CardSize, CardSizeConfig> = {
  S:  { ...CARD_SIZE_LAYOUT_CONFIGS.S, fontScale: 0.85 },
  M:  { ...CARD_SIZE_LAYOUT_CONFIGS.M, fontScale: 1.0 },
  L:  { ...CARD_SIZE_LAYOUT_CONFIGS.L, fontScale: 1.15 },
  XL: { ...CARD_SIZE_LAYOUT_CONFIGS.XL, fontScale: 1.35 },
};

export { CARD_SIZE_KEY, COLOR_SCHEME_KEY } from '../storage/keys';
export const DEFAULT_CARD_SIZE: CardSize = 'M';
export const DEFAULT_COLOR_SCHEME: ColorScheme = 'dark';

function isColorScheme(value: unknown): value is ColorScheme {
  return typeof value === 'string' && (COLOR_SCHEMES as readonly string[]).includes(value);
}

// Read synchronously from localStorage on web so the first render matches
// the stored preference -- avoids SSR/client hydration mismatch.
function readStoredColorScheme(): ColorScheme {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const value = window.localStorage.getItem(COLOR_SCHEME_KEY);
      if (isColorScheme(value)) return value;
    } catch {}
  }
  return DEFAULT_COLOR_SCHEME;
}

function readStoredCardSize(): CardSize {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const value = window.localStorage.getItem(CARD_SIZE_KEY);
      if (isCardSize(value)) return value;
    } catch {}
  }
  return DEFAULT_CARD_SIZE;
}

interface UISettingsContextType {
  cardSize: CardSize;
  setCardSize: (size: CardSize) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  resetUISettings: () => void;
}

const UISettingsContext = createContext<UISettingsContextType | null>(null);

export function UISettingsProvider({ children }: { children: React.ReactNode }) {
  const [cardSize, setCardSizeState] = useState<CardSize>(readStoredCardSize);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(readStoredColorScheme);

  useEffect(() => {
    // On native (no localStorage), still load from AsyncStorage
    if (Platform.OS !== 'web') {
      const token = createAppDataWriteToken();
      Promise.all([
        getAppDataItem(CARD_SIZE_KEY, token),
        getAppDataItem(COLOR_SCHEME_KEY, token),
      ]).then(([rawSize, rawScheme]) => {
        try {
          if (isCardSize(rawSize)) setCardSizeState(rawSize);
        } catch (e) {
          console.warn('[dnd-ref] Failed to parse card size preference:', e);
        }
        try {
          if (isColorScheme(rawScheme)) setColorSchemeState(rawScheme);
        } catch (e) {
          console.warn('[dnd-ref] Failed to parse color scheme preference:', e);
        }
      }).catch((e: unknown) => {
        console.warn('[dnd-ref] Failed to load UI preferences:', e);
      });
    }
  }, []);

  const setCardSize = useCallback((size: CardSize) => {
    const token = createAppDataWriteToken();
    if (!isAppDataWriteTokenCurrent(token)) return;
    setCardSizeState(size);
    setAppDataItem(CARD_SIZE_KEY, size, { token }).catch((e: unknown) => {
      console.warn('[dnd-ref] Failed to save card size preference:', e);
    });
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    const token = createAppDataWriteToken();
    if (!isAppDataWriteTokenCurrent(token)) return;
    setColorSchemeState(scheme);
    setAppDataItem(COLOR_SCHEME_KEY, scheme, { token }).catch((e: unknown) => {
      console.warn('[dnd-ref] Failed to save color scheme preference:', e);
    });
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
  if (!ctx) throw new Error('useUISettings must be used within UISettingsProvider');
  return ctx;
}

export function useColors(): Colors {
  const ctx = useContext(UISettingsContext);
  const systemScheme = useColorScheme();
  const scheme = ctx?.colorScheme ?? 'dark';
  if (scheme === 'light') return LIGHT;
  if (scheme === 'dark') return DARK;
  return systemScheme === 'light' ? LIGHT : DARK;
}
