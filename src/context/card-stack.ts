import type { Entity } from '../entities';
import type { CardState } from './session-types';

export const MAX_CARDS = 6;

export function extractCard(cards: CardState[], instanceId: string): [CardState, CardState[]] | null {
  const card = cards.find((c) => c.instanceId === instanceId);
  if (!card) return null;
  return [card, cards.filter((c) => c.instanceId !== instanceId)];
}

export function buildCardIdSet(cards: CardState[]): Set<string> {
  return new Set(cards.map((c) => c.entity.id));
}

export function insertAfterPinned(cards: CardState[], card: CardState): CardState[] {
  const lastPinnedIdx = cards.reduce((acc, c, i) => (c.pinned ? i : acc), -1);
  const result = [...cards];
  result.splice(lastPinnedIdx + 1, 0, card);
  return result;
}

export function addCard(cards: CardState[], entity: Entity): CardState[] {
  const existingIds = buildCardIdSet(cards);
  if (existingIds.has(entity.id)) return cards;

  const newCard: CardState = { instanceId: `${entity.id}-${Date.now()}`, entity, pinned: false };
  const next = insertAfterPinned(cards, newCard);

  if (next.length > MAX_CARDS) {
    let evictIdx = -1;
    for (let i = next.length - 1; i >= 0; i--) {
      if (!next[i].pinned) { evictIdx = i; break; }
    }
    if (evictIdx === -1) return cards;
    next.splice(evictIdx, 1);
  }

  return next;
}

export function pinCard(cards: CardState[], instanceId: string): CardState[] {
  const result = extractCard(cards, instanceId);
  if (!result) return cards;
  const [card, rest] = result;
  return [{ ...card, pinned: true }, ...rest];
}

export function unpinCard(cards: CardState[], instanceId: string): CardState[] {
  const result = extractCard(cards, instanceId);
  if (!result) return cards;
  const [card, rest] = result;
  return insertAfterPinned(rest, { ...card, pinned: false });
}

export function dismissCard(cards: CardState[], instanceId: string): CardState[] {
  return cards.filter((c) => c.instanceId !== instanceId);
}
