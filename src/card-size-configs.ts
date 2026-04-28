export const CARD_SIZES = ["S", "M", "L", "XL"] as const;

export type CardSize = (typeof CARD_SIZES)[number];

export const isCardSize = (value: unknown): value is CardSize =>
  typeof value === "string" && (CARD_SIZES as readonly string[]).includes(value);

export type CardSizeLayoutConfig = { landscapeCols: number; portraitCols: number };

export const CARD_SIZE_LAYOUT_CONFIGS: Record<CardSize, CardSizeLayoutConfig> = {
  S: { landscapeCols: 4, portraitCols: 3 },
  M: { landscapeCols: 3, portraitCols: 2 },
  L: { landscapeCols: 2, portraitCols: 2 },
  XL: { landscapeCols: 2, portraitCols: 1 },
};

export type CardSizeConfig = CardSizeLayoutConfig & { fontScale: number };

export const CARD_SIZE_CONFIGS: Record<CardSize, CardSizeConfig> = {
  S: { ...CARD_SIZE_LAYOUT_CONFIGS.S, fontScale: 0.85 },
  M: { ...CARD_SIZE_LAYOUT_CONFIGS.M, fontScale: 1.0 },
  L: { ...CARD_SIZE_LAYOUT_CONFIGS.L, fontScale: 1.15 },
  XL: { ...CARD_SIZE_LAYOUT_CONFIGS.XL, fontScale: 1.35 },
};
