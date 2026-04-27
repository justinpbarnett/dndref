import type { CardState } from './context/session-types';
import type { EntityType } from './entities';

export const ENTITY_CARD_MAX_SUMMARY_BULLETS = 5;
export const ENTITY_CARD_BULLET_MARKER = '>';

type EntityCardPinToggleKind = 'pin' | 'unpin';
type EntityCardPinToggleIconName = 'bookmark' | 'bookmark-outline';
type EntityCardPinToggleLabel = 'Pin' | 'Unpin';

export interface EntityCardPinTogglePresentation {
  kind: EntityCardPinToggleKind;
  accessibilityLabel: EntityCardPinToggleLabel;
  iconName: EntityCardPinToggleIconName;
}

export interface EntityCardDismissActionPresentation {
  kind: 'dismiss';
  accessibilityLabel: 'Dismiss';
  iconName: 'close';
}

export interface EntityCardActionsPresentation {
  pinToggle: EntityCardPinTogglePresentation;
  dismiss: EntityCardDismissActionPresentation;
}

export interface EntityCardPresentation {
  instanceId: string;
  name: string;
  type: EntityType;
  typeLabel: string;
  accentColor: string;
  pinned: boolean;
  imageUri: string | null;
  bulletMarker: typeof ENTITY_CARD_BULLET_MARKER;
  summaryBullets: string[];
  actions: EntityCardActionsPresentation;
}

export interface DeriveEntityCardPresentationInput {
  card: CardState;
  accentColor: string;
}

export function extractEntityCardSummaryBullets(summary: string): string[] {
  return summary
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/[.!?]$/, '').trim())
    .filter((sentence) => sentence.length > 0)
    .slice(0, ENTITY_CARD_MAX_SUMMARY_BULLETS);
}

function derivePinTogglePresentation(pinned: boolean): EntityCardPinTogglePresentation {
  if (pinned) {
    return {
      kind: 'unpin',
      accessibilityLabel: 'Unpin',
      iconName: 'bookmark',
    };
  }

  return {
    kind: 'pin',
    accessibilityLabel: 'Pin',
    iconName: 'bookmark-outline',
  };
}

export function deriveEntityCardPresentation({
  card,
  accentColor,
}: DeriveEntityCardPresentationInput): EntityCardPresentation {
  const { entity, pinned } = card;
  const imageUri = entity.image || null;

  return {
    instanceId: card.instanceId,
    name: entity.name,
    type: entity.type,
    typeLabel: entity.type.toUpperCase(),
    accentColor,
    pinned,
    imageUri,
    bulletMarker: ENTITY_CARD_BULLET_MARKER,
    summaryBullets: extractEntityCardSummaryBullets(entity.summary),
    actions: {
      pinToggle: derivePinTogglePresentation(pinned),
      dismiss: {
        kind: 'dismiss',
        accessibilityLabel: 'Dismiss',
        iconName: 'close',
      },
    },
  };
}
