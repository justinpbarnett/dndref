import { Platform } from 'react-native';

import { EntityType } from './entities';

export const F = {
  display: Platform.select({
    web: "'Cinzel', Georgia, 'Times New Roman', serif",
    ios: 'Georgia',
    default: 'serif',
  }),
  body: Platform.select({
    web: "'EB Garamond', Georgia, serif",
    ios: 'Georgia',
    default: undefined,
  }),
  mono: Platform.select({
    web: "'Courier Prime', 'Courier New', monospace",
    ios: 'Menlo',
    default: 'monospace',
  }),
};

export interface Colors {
  bg: string;
  bgCard: string;
  bgCardPinned: string;
  bgSurface: string;
  bgInput: string;

  border: string;
  borderMed: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textDim: string;
  textMuted: string;

  location: string;
  npc: string;
  faction: string;
  item: string;
  unknown: string;

  active: string;
  paused: string;
  error: string;
}

export const DARK: Colors = {
  bg: '#080706',
  bgCard: '#111009',
  bgCardPinned: '#1a1208',
  bgSurface: '#0c0a07',
  bgInput: '#0f0c09',

  border: '#241c12',
  borderMed: '#302018',
  borderStrong: '#3e2e1a',

  textPrimary: '#e4d5b0',
  textSecondary: '#b09070',
  textDim: '#7a6448',
  textMuted: '#4a3c2c',

  location: '#5a9fd4',
  npc: '#45b882',
  faction: '#c44d6a',
  item: '#c47a2c',
  unknown: '#6a5840',

  active: '#3fc878',
  paused: '#c47a2c',
  error: '#c44d6a',
};

export const LIGHT: Colors = {
  bg: '#f2ece0',
  bgCard: '#ebe4d6',
  bgCardPinned: '#e4dbc8',
  bgSurface: '#ece5d5',
  bgInput: '#e4dcc8',

  border: '#c8b898',
  borderMed: '#b4a480',
  borderStrong: '#9e8e68',

  textPrimary: '#1c1408',
  textSecondary: '#4a3820',
  textDim: '#7a6040',
  textMuted: '#a08060',

  location: '#2878b0',
  npc: '#1e8050',
  faction: '#b03060',
  item: '#9a5018',
  unknown: '#6a5030',

  active: '#1e8050',
  paused: '#9a5018',
  error: '#b03060',
};

export function typeAccent(type: EntityType, colors: Colors): string {
  const map: Record<EntityType, string> = {
    Location: colors.location,
    NPC: colors.npc,
    Faction: colors.faction,
    Item: colors.item,
    Unknown: colors.unknown,
  };
  return map[type];
}
