export const CARD_SIZES = ['S', 'M', 'L', 'XL'] as const;

export type CardSize = (typeof CARD_SIZES)[number];

export function isCardSize(value: unknown): value is CardSize {
  return typeof value === 'string' && (CARD_SIZES as readonly string[]).includes(value);
}

export interface CardSizeLayoutConfig {
  landscapeCols: number;
  portraitCols: number;
}

export const CARD_SIZE_LAYOUT_CONFIGS: Record<CardSize, CardSizeLayoutConfig> = {
  S:  { landscapeCols: 4, portraitCols: 3 },
  M:  { landscapeCols: 3, portraitCols: 2 },
  L:  { landscapeCols: 2, portraitCols: 2 },
  XL: { landscapeCols: 2, portraitCols: 1 },
};

export const REFERENCE_CARD_LAYOUT = {
  gridPad: 5,
  cardMargin: 5,
  minCardWidth: 230,
  maxCardWidth: 380,
  defaultMeasuredHeight: 200,
} as const;

export interface ReferenceCardLayoutItem {
  instanceId: string;
}

export interface ReferenceCardLayoutViewport {
  width: number;
  height: number;
}

export interface ReferenceCardPosition {
  x: number;
  y: number;
}

export interface ReferenceCardLayout {
  columns: number;
  cardWidth: number;
  gridWidth: number;
  xOffset: number;
  positions: Record<string, ReferenceCardPosition>;
  totalHeight: number;
}

export interface ComputeReferenceCardLayoutInput {
  cards: readonly ReferenceCardLayoutItem[];
  measuredHeights: Readonly<Record<string, number>>;
  viewport: ReferenceCardLayoutViewport;
  cardSize: CardSize;
}

export function computeReferenceCardLayout({
  cards,
  measuredHeights,
  viewport,
  cardSize,
}: ComputeReferenceCardLayoutInput): ReferenceCardLayout {
  const {
    gridPad,
    cardMargin,
    minCardWidth,
    maxCardWidth,
    defaultMeasuredHeight,
  } = REFERENCE_CARD_LAYOUT;
  const { width: viewportWidth, height: viewportHeight } = viewport;
  const config = CARD_SIZE_LAYOUT_CONFIGS[cardSize];
  const preferredColumns = viewportWidth > viewportHeight ? config.landscapeCols : config.portraitCols;
  const maxReadableColumns = Math.max(
    1,
    Math.floor((viewportWidth - 2 * gridPad) / (minCardWidth + 2 * cardMargin)),
  );
  const columns = Math.min(preferredColumns, maxReadableColumns);
  const gridWidth = Math.min(
    viewportWidth,
    columns * (maxCardWidth + 2 * cardMargin) + 2 * gridPad,
  );
  const xOffset = Math.max(0, (viewportWidth - gridWidth) / 2);
  const cardWidth = (gridWidth - 2 * gridPad) / columns - 2 * cardMargin;
  const columnWidth = cardWidth + 2 * cardMargin;

  const rowHeights: number[] = [];
  for (let i = 0; i < cards.length; i++) {
    const row = Math.floor(i / columns);
    const cardHeight = measuredHeights[cards[i].instanceId] ?? defaultMeasuredHeight;
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, cardHeight);
  }

  const rowTops: number[] = [gridPad];
  for (let r = 0; r < rowHeights.length; r++) {
    rowTops[r + 1] = rowTops[r] + rowHeights[r];
  }

  const positions: Record<string, ReferenceCardPosition> = {};
  for (let i = 0; i < cards.length; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    positions[cards[i].instanceId] = {
      x: xOffset + gridPad + col * columnWidth,
      y: rowTops[row],
    };
  }

  return {
    columns,
    cardWidth,
    gridWidth,
    xOffset,
    positions,
    totalHeight: rowTops[rowHeights.length] + gridPad,
  };
}
