import { describe, expect, it } from "vitest";

import { addCard, addRankedCards, MAX_CARDS } from "./card-stack";
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

const rankedHits = ["guard", "mage", "cubic-gate", "planetar", "assassin", "spell-scroll", "killer-whale"].map(
  makeEntity,
);

describe("addRankedCards", () => {
  it("keeps the strongest matches when a pass returns more hits than the stack holds", () => {
    const next = addRankedCards([], rankedHits);

    expect(next).toHaveLength(MAX_CARDS);
    expect(next.map((card) => card.entity.id)).toEqual([
      "spell-scroll",
      "assassin",
      "planetar",
      "cubic-gate",
      "mage",
      "guard",
    ]);
  });

  it("keeps a card already showing when it is one of the strongest hits", () => {
    const guard = makeCard("guard");

    const next = addRankedCards([guard], rankedHits);

    expect(next).toHaveLength(MAX_CARDS);
    expect(next.find((card) => card.entity.id === "guard")).toBe(guard);
    expect(next.map((card) => card.entity.id)).not.toContain("killer-whale");
  });

  it("keeps pinned cards and spends the open slots on the strongest hits", () => {
    const pinned = makeCard("pinned", true);

    const next = addRankedCards([pinned, makeCard("stale")], rankedHits);

    expect(next[0]).toBe(pinned);
    expect(next.map((card) => card.entity.id)).toEqual([
      "pinned",
      "assassin",
      "planetar",
      "cubic-gate",
      "mage",
      "guard",
    ]);
  });

  it("evicts the rightmost unpinned card when one new hit arrives on a full stack", () => {
    const cards = [...fill(MAX_CARDS - 1, true), makeCard("evictable")];

    const next = addRankedCards(cards, [makeEntity("newcomer")]);

    expect(next.map((card) => card.entity.id)).toEqual([
      ...fill(MAX_CARDS - 1, true).map((card) => card.entity.id),
      "newcomer",
    ]);
  });

  it("leaves a full stack of pinned cards unchanged", () => {
    const full = fill(MAX_CARDS, true);

    expect(addRankedCards(full, [makeEntity("newcomer")])).toBe(full);
  });

  it("returns the same stack when the pass names only cards already showing", () => {
    const cards = [makeCard("guard")];

    expect(addRankedCards(cards, [makeEntity("guard")])).toBe(cards);
  });
});
