import type { Entity } from "../../entities";
import type { CardState } from "../session-types";

export function extractCard(cards: CardState[], instanceId: string): [CardState, CardState[]] | null {
  const card = cards.find((candidate) => candidate.instanceId === instanceId);
  return card ? [card, cards.filter((candidate) => candidate.instanceId !== instanceId)] : null;
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

export function addCard(cards: CardState[], entity: Entity): CardState[] {
  if (cards.some((card) => card.entity.id === entity.id)) return cards;

  const newCard: CardState = { instanceId: `${entity.id}-${Date.now()}`, entity, pinned: false };
  const nextCards = insertAfterPinned(cards, newCard);

  if (nextCards.length > 6) {
    const evictionIndex = nextCards.findLastIndex((card) => !card.pinned);
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

export const dismissCard = (cards: CardState[], instanceId: string): CardState[] =>
  cards.filter((card) => card.instanceId !== instanceId);
