import { Platform } from 'react-native';
import { EntityType } from './entities';

export const C = {
  bg: '#080706',
  bgCard: '#0d0a07',
  bgCardPinned: '#161009',
  bgSurface: '#0b0907',
  bgInput: '#0f0c09',

  border: '#1c1610',
  borderMed: '#28201a',
  borderStrong: '#362c1e',

  textPrimary: '#dcc89a',
  textSecondary: '#786448',
  textMuted: '#2e2518',
  textDim: '#4a3c2a',

  location: '#5a9fd4',
  npc: '#45b882',
  faction: '#c44d6a',
  item: '#c47a2c',
  unknown: '#6a5840',

  active: '#3fc878',
  paused: '#c47a2c',
};

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

const TYPE_ACCENT: Record<EntityType, string> = {
  Location: C.location,
  NPC: C.npc,
  Faction: C.faction,
  Item: C.item,
  Unknown: C.unknown,
};

export function typeAccent(type: EntityType): string {
  return TYPE_ACCENT[type];
}
