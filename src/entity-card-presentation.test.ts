import { describe, expect, test } from 'vitest';

import type { CardState } from './context/session-types';
import { deriveEntityCardPresentation, extractEntityCardSummaryBullets } from './entity-card-presentation';

function makeCard(overrides: Partial<CardState> = {}): CardState {
  return {
    instanceId: 'card-1',
    pinned: false,
    entity: {
      id: 'ironspire',
      name: 'Ironspire Fortress',
      type: 'Location',
      aliases: [],
      summary: 'Ancient dwarven stronghold. Seven levels deep.',
      image: undefined,
    },
    ...overrides,
  };
}

describe('extractEntityCardSummaryBullets', () => {
  test('splits sentence summaries into display bullets with terminal marks removed', () => {
    expect(extractEntityCardSummaryBullets('The Lich King. Undead sorcerer! His phylactery remains hidden.')).toEqual([
      'The Lich King',
      'Undead sorcerer',
      'His phylactery remains hidden',
    ]);
  });

  test.each(['', '   \n  '])('returns no bullets for empty summary %#', (summary) => {
    expect(extractEntityCardSummaryBullets(summary)).toEqual([]);
  });

  test('limits long summaries to five bullets', () => {
    const summary = 'One. Two. Three. Four. Five. Six. Seven.';

    expect(extractEntityCardSummaryBullets(summary)).toEqual([
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
    ]);
  });

  test('handles punctuation while preserving internal punctuation', () => {
    const summary = 'Who guards the armory? Gorm knows: level 4. Wait--listen!';

    expect(extractEntityCardSummaryBullets(summary)).toEqual([
      'Who guards the armory',
      'Gorm knows: level 4',
      'Wait--listen',
    ]);
  });
});

describe('deriveEntityCardPresentation', () => {
  test('represents type, accent color, image presence, and available actions for unpinned cards', () => {
    const card = makeCard({
      entity: {
        id: 'ironspire',
        name: 'Ironspire Fortress',
        type: 'Location',
        aliases: [],
        summary: 'Ancient dwarven stronghold. Seven levels deep.',
        image: 'https://example.com/ironspire.png',
      },
    });

    expect(deriveEntityCardPresentation({ card, accentColor: '#2878b0' })).toEqual({
      instanceId: 'card-1',
      name: 'Ironspire Fortress',
      type: 'Location',
      typeLabel: 'LOCATION',
      accentColor: '#2878b0',
      pinned: false,
      hasImage: true,
      imageUri: 'https://example.com/ironspire.png',
      bulletMarker: '>',
      summaryBullets: ['Ancient dwarven stronghold', 'Seven levels deep'],
      actions: {
        pinToggle: {
          kind: 'pin',
          accessibilityLabel: 'Pin',
          iconName: 'bookmark-outline',
          available: true,
        },
        dismiss: {
          kind: 'dismiss',
          accessibilityLabel: 'Dismiss',
          iconName: 'close',
          available: true,
        },
      },
    });
  });

  test('represents pinned state with unpin action and absent image state', () => {
    const card = makeCard({
      pinned: true,
      entity: {
        id: 'valdrath',
        name: 'Valdrath the Undying',
        type: 'NPC',
        aliases: [],
        summary: '',
      },
    });

    expect(deriveEntityCardPresentation({ card, accentColor: '#45b882' })).toMatchObject({
      name: 'Valdrath the Undying',
      type: 'NPC',
      typeLabel: 'NPC',
      accentColor: '#45b882',
      pinned: true,
      hasImage: false,
      imageUri: null,
      summaryBullets: [],
      actions: {
        pinToggle: {
          kind: 'unpin',
          accessibilityLabel: 'Unpin',
          iconName: 'bookmark',
          available: true,
        },
        dismiss: {
          kind: 'dismiss',
          accessibilityLabel: 'Dismiss',
          iconName: 'close',
          available: true,
        },
      },
    });
  });
});
