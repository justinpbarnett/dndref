import type { Entity } from "../entities/index";
import type { CardState } from "./session-types";

export const MAX_CARDS = 6;

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

/**
 * Room is made before the insert, never after it. Deciding afterwards let the
 * new card stand as its own eviction candidate, so a stack of pinned cards
 * dropped the newcomer and still returned a fresh array holding the same cards.
 * Callers compare stacks by identity, so that read as a change.
 */
export function addCard(cards: CardState[], entity: Entity): CardState[] {
  if (cards.some((card) => card.entity.id === entity.id)) return cards;
  return insertCard(cards, entity, () => false);
}

export function addRankedCards(cards: CardState[], rankedBestFirst: Entity[]): CardState[] {
  const pinned = cards.filter((card) => card.pinned);
  const unpinnedSeats = Math.max(0, MAX_CARDS - pinned.length);
  const showing = new Set(cards.map((card) => card.entity.id));
  const keptIds = new Set(pinned.map((card) => card.entity.id));

  const keptRanked: Entity[] = [];
  for (const entity of rankedBestFirst) {
    if (keptIds.has(entity.id)) continue;
    if (keptRanked.length >= unpinnedSeats) break;
    keptRanked.push(entity);
    keptIds.add(entity.id);
  }

  const staleRoom = unpinnedSeats - keptRanked.length;
  for (const card of cards.filter((card) => !keptIds.has(card.entity.id)).slice(0, staleRoom)) {
    keptIds.add(card.entity.id);
  }

  const newcomers = keptRanked.filter((entity) => !showing.has(entity.id));
  if (newcomers.length === 0 && cards.every((card) => keptIds.has(card.entity.id))) return cards;

  let next = cards.filter((card) => keptIds.has(card.entity.id));
  for (const entity of newcomers) next = insertCard(next, entity, (card) => keptIds.has(card.entity.id));
  return next;
}

function insertCard(cards: CardState[], entity: Entity, spare: (card: CardState) => boolean): CardState[] {
  let withRoom = cards;
  if (withRoom.length >= MAX_CARDS) {
    const evictionIndex = withRoom.findLastIndex((card) => !card.pinned && !spare(card));
    if (evictionIndex === -1) return cards;
    withRoom = withRoom.filter((_, index) => index !== evictionIndex);
  }

  return insertAfterPinned(withRoom, { instanceId: `${entity.id}-${Date.now()}`, entity, pinned: false });
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
