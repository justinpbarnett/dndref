import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type CardSize = 'S' | 'M' | 'L' | 'XL';

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

interface UISettingsContextType {
  cardSize: CardSize;
  setCardSize: (size: CardSize) => void;
}

const UISettingsContext = createContext<UISettingsContextType | null>(null);

export function UISettingsProvider({ children }: { children: React.ReactNode }) {
  const [cardSize, setCardSizeState] = useState<CardSize>('M');

  useEffect(() => {
    AsyncStorage.getItem(CARD_SIZE_KEY).then((raw) => {
      if (raw && raw in CARD_SIZE_CONFIGS) setCardSizeState(raw as CardSize);
    }).catch((e: unknown) => {
      console.warn('[dnd-ref] Failed to load card size preference:', e);
    });
  }, []);

  const setCardSize = useCallback((size: CardSize) => {
    setCardSizeState(size);
    AsyncStorage.setItem(CARD_SIZE_KEY, size).catch((e: unknown) => {
      console.warn('[dnd-ref] Failed to save card size preference:', e);
    });
  }, []);

  return (
    <UISettingsContext.Provider value={{ cardSize, setCardSize }}>
      {children}
    </UISettingsContext.Provider>
  );
}

export function useUISettings() {
  const ctx = useContext(UISettingsContext);
  if (!ctx) throw new Error('useUISettings must be used within UISettingsProvider');
  return ctx;
}
