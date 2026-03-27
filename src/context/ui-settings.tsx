import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, DARK, LIGHT } from '../theme';

export type CardSize = 'S' | 'M' | 'L' | 'XL';
export type ColorScheme = 'dark' | 'light' | 'system';

export interface CardSizeConfig {
  landscapeCols: number;
  portraitCols: number;
  fontScale: number;
}

export const CARD_SIZE_CONFIGS: Record<CardSize, CardSizeConfig> = {
  S:  { landscapeCols: 4, portraitCols: 3, fontScale: 0.85 },
  M:  { landscapeCols: 3, portraitCols: 2, fontScale: 1.0 },
  L:  { landscapeCols: 2, portraitCols: 2, fontScale: 1.15 },
  XL: { landscapeCols: 2, portraitCols: 1, fontScale: 1.35 },
};

const CARD_SIZE_KEY = '@dnd-ref/card-size';
const COLOR_SCHEME_KEY = '@dnd-ref/color-scheme';

interface UISettingsContextType {
  cardSize: CardSize;
  setCardSize: (size: CardSize) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const UISettingsContext = createContext<UISettingsContextType | null>(null);

export function UISettingsProvider({ children }: { children: React.ReactNode }) {
  const [cardSize, setCardSizeState] = useState<CardSize>('M');
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('system');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CARD_SIZE_KEY),
      AsyncStorage.getItem(COLOR_SCHEME_KEY),
    ]).then(([rawSize, rawScheme]) => {
      if (rawSize && rawSize in CARD_SIZE_CONFIGS) setCardSizeState(rawSize as CardSize);
      if (rawScheme === 'dark' || rawScheme === 'light' || rawScheme === 'system') {
        setColorSchemeState(rawScheme);
      }
    }).catch((e: unknown) => {
      console.warn('[dnd-ref] Failed to load UI preferences:', e);
    });
  }, []);

  const setCardSize = useCallback((size: CardSize) => {
    setCardSizeState(size);
    AsyncStorage.setItem(CARD_SIZE_KEY, size).catch((e: unknown) => {
      console.warn('[dnd-ref] Failed to save card size preference:', e);
    });
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme).catch((e: unknown) => {
      console.warn('[dnd-ref] Failed to save color scheme preference:', e);
    });
  }, []);

  return (
    <UISettingsContext.Provider value={{ cardSize, setCardSize, colorScheme, setColorScheme }}>
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
  const scheme = ctx?.colorScheme ?? 'system';
  if (scheme === 'light') return LIGHT;
  if (scheme === 'dark') return DARK;
  return systemScheme === 'light' ? LIGHT : DARK;
}
