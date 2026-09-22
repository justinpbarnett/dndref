import { describe, expect, it } from "vitest";

import { addCard, MAX_CARDS } from "./card-stack";
import type { CardState } from "./session-types";
import type { Entity } from "../entities/index";

const makeEntity = (id: string): Entity => ({
  id,
  name: id,
  type: "NPC",
  aliases: [],
  summary: `${id} summary`,
});

const makeCard = (id: string, pinned = false): CardState => ({
  instanceId: `${id}-1`,
  entity: makeEntity(id),
  pinned,
});

const fill = (count: number, pinned: boolean): CardState[] =>
  Array.from({ length: count }, (_, index) => makeCard(`card-${index}`, pinned));

describe("addCard", () => {
  it("keeps the stack unchanged when every card is pinned and there is no room", () => {
    const full = fill(MAX_CARDS, true);

    expect(addCard(full, makeEntity("newcomer"))).toBe(full);
  });

  it("evicts the rightmost unpinned card to make room for a new one", () => {
    const cards = [...fill(MAX_CARDS - 1, true), makeCard("evictable")];

    const next = addCard(cards, makeEntity("newcomer"));

    expect(next).toHaveLength(MAX_CARDS);
    expect(next.map((card) => card.entity.id)).not.toContain("evictable");
    expect(next.map((card) => card.entity.id)).toContain("newcomer");
  });

  it("places a new card after the pinned ones", () => {
    const cards = [makeCard("pinned", true), makeCard("loose")];

    expect(addCard(cards, makeEntity("newcomer")).map((card) => card.entity.id)).toEqual([
      "pinned",
      "newcomer",
      "loose",
    ]);
  });

  it("keeps the stack unchanged when the entity already has a card", () => {
    const cards = [makeCard("valdrath")];

    expect(addCard(cards, makeEntity("valdrath"))).toBe(cards);
  });
});
