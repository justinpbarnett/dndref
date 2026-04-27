import type { Entity } from '../entities';
import type { CardState } from './session-types';

export const MAX_CARDS = 6;

export function extractCard(cards: CardState[], instanceId: string): [CardState, CardState[]] | null {
  const card = cards.find((candidate) => candidate.instanceId === instanceId);
  if (!card) return null;

  const remainingCards = cards.filter((candidate) => candidate.instanceId !== instanceId);
  return [card, remainingCards];
}

export function buildCardIdSet(cards: CardState[]): Set<string> {
  return new Set(cards.map((card) => card.entity.id));
}

export function insertAfterPinned(cards: CardState[], card: CardState): CardState[] {
  const lastPinnedIndex = cards.reduce((lastIndex, candidate, index) => {
    if (!candidate.pinned) return lastIndex;
    return index;
  }, -1);
  const nextCards = [...cards];
  nextCards.splice(lastPinnedIndex + 1, 0, card);
  return nextCards;
}

function findRightmostUnpinnedIndex(cards: CardState[]): number {
  for (let index = cards.length - 1; index >= 0; index--) {
    if (!cards[index].pinned) {
      return index;
    }
  }

  return -1;
}

export function addCard(cards: CardState[], entity: Entity): CardState[] {
  const existingIds = buildCardIdSet(cards);
  if (existingIds.has(entity.id)) return cards;

  const newCard: CardState = { instanceId: `${entity.id}-${Date.now()}`, entity, pinned: false };
  const nextCards = insertAfterPinned(cards, newCard);

  if (nextCards.length > MAX_CARDS) {
    const evictionIndex = findRightmostUnpinnedIndex(nextCards);
    if (evictionIndex === -1) return cards;
    nextCards.splice(evictionIndex, 1);
  }

  return nextCards;
}

export function pinCard(cards: CardState[], instanceId: string): CardState[] {
  const extracted = extractCard(cards, instanceId);
  if (!extracted) return cards;
  const [card, rest] = extracted;
  return [{ ...card, pinned: true }, ...rest];
}

export function unpinCard(cards: CardState[], instanceId: string): CardState[] {
  const extracted = extractCard(cards, instanceId);
  if (!extracted) return cards;
  const [card, rest] = extracted;
  return insertAfterPinned(rest, { ...card, pinned: false });
}

export function dismissCard(cards: CardState[], instanceId: string): CardState[] {
  return cards.filter((card) => card.instanceId !== instanceId);
}
