import { Platform } from 'react-native';
import { EntityType } from './entities';

export const C = {
  bg: '#0b0907',
  bgCard: '#141008',
  bgCardPinned: '#1c1610',
  bgSurface: '#0f0c09',
  bgInput: '#100d0a',

  border: '#211a10',
  borderMed: '#2e2418',
  borderStrong: '#3c3020',

  textPrimary: '#e2cfac',
  textSecondary: '#6a5c44',
  textMuted: '#322a1e',
  textDim: '#483c2c',

  location: '#4e8bbf',
  npc: '#3da878',
  faction: '#b84460',
  item: '#b87228',
  unknown: '#5e5040',

  active: '#34b070',
  paused: '#b87228',
};

export const F = {
  display: Platform.select({
    web: "Georgia, 'Times New Roman', serif",
    default: undefined,
  }),
  body: undefined,
  mono: Platform.select({
    web: "'Courier New', monospace",
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
