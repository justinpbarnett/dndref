import { afterEach, describe, expect, it, vi } from "vitest";

import { hydrateScryfallCards, ScryfallProvider } from "./scryfall";
import type { Entity } from "../index";

type ScryfallStub = { names?: unknown[]; cards?: Record<string, unknown>[]; failCollection?: boolean };

const collectionRequests: unknown[][] = [];

/** Stands in for Scryfall: the names catalog on GET, the card collection on POST. */
function stubScryfall({ names = [], cards = [], failCollection = false }: ScryfallStub) {
  collectionRequests.length = 0;

  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (String(url).includes("/catalog/card-names")) {
      return { ok: true, json: async () => ({ object: "catalog", data: names }) } as Response;
    }

    if (failCollection) throw new TypeError("Failed to fetch");

    const body = JSON.parse(String(init?.body ?? "{}")) as { identifiers: { name: string }[] };
    collectionRequests.push(body.identifiers);
    const asked = new Set(body.identifiers.map((identifier) => identifier.name));
    const data = cards.filter((card) => matchesAsked(card, asked));
    return { ok: true, json: async () => ({ data }) } as Response;
  });
}

const matchesAsked = (card: Record<string, unknown>, asked: Set<string>): boolean =>
  String(card.name)
    .split("//")
    .map((part) => part.trim())
    .some((part) => asked.has(part));

const named = (name: string): Entity => ({ id: `mtg-${name}`, name, type: "Unknown", aliases: [], summary: "" });

afterEach(() => vi.unstubAllGlobals());

describe("ScryfallProvider", () => {
  it("indexes every name in the catalog", async () => {
    stubScryfall({ names: ["Lightning Bolt", "Black Lotus"] });

    const entities = await new ScryfallProvider().load();

    expect(entities.map((entity) => entity.name)).toEqual(["Lightning Bolt", "Black Lotus"]);
  });

  it("drops catalog entries that are not names", async () => {
    stubScryfall({ names: ["Lightning Bolt", null, 7, "", "   "] });

    const entities = await new ScryfallProvider().load();

    expect(entities.map((entity) => entity.name)).toEqual(["Lightning Bolt"]);
  });

  it("gives two cards distinct ids even when their names reduce to one slug", async () => {
    stubScryfall({ names: ['"Ach! Hans, Run!"', "Ach Hans Run"] });

    const [first, second] = await new ScryfallProvider().load();

    expect(first.id).not.toBe(second.id);
  });

  it("names a multi-faced card after its front face and keeps the rest as aliases", async () => {
    stubScryfall({ names: ["Delver of Secrets // Insectile Aberration", "Who // What // When // Where // Why"] });

    const [delver, who] = await new ScryfallProvider().load();

    expect(delver.name).toBe("Delver of Secrets");
    expect(delver.aliases).toEqual(["Insectile Aberration"]);
    expect(who.name).toBe("Who");
    expect(who.aliases).toEqual(["What", "When", "Where", "Why"]);
  });

  it("indexes a card the catalog spells with nothing but separators as no card at all", async () => {
    stubScryfall({ names: ["//", " // ", "Lightning Bolt"] });

    const entities = await new ScryfallProvider().load();

    expect(entities.map((entity) => entity.name)).toEqual(["Lightning Bolt"]);
  });

  it("raises a reachable error when the catalog request fails", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response);

    await expect(new ScryfallProvider().load()).rejects.toThrow("503");
  });
});

describe("hydrateScryfallCards", () => {
  it("fills in cost, type line, rules text and art", async () => {
    stubScryfall({
      cards: [
        {
          name: "Lightning Bolt",
          mana_cost: "{R}",
          type_line: "Instant",
          oracle_text: "Lightning Bolt deals 3 damage to any target.",
          image_uris: { normal: "https://cards.scryfall.io/normal/bolt.jpg" },
        },
      ],
    });

    const [bolt] = await hydrateScryfallCards([named("Lightning Bolt")]);

    expect(bolt.summary).toBe("{R}  Instant\nLightning Bolt deals 3 damage to any target.");
    expect(bolt.type).toBe("Item");
    expect(bolt.image).toBe("https://cards.scryfall.io/normal/bolt.jpg");
  });

  it.each([
    ["Creature — Goblin", "NPC"],
    ["Legendary Planeswalker — Jace", "NPC"],
    ["Basic Land — Island", "Location"],
    ["Legendary Artifact", "Item"],
    ["Instant", "Item"],
  ])("reads %s as %s", async (typeLine, expected) => {
    stubScryfall({ cards: [{ name: "Test Card", type_line: typeLine, oracle_text: "Does a thing." }] });

    const [card] = await hydrateScryfallCards([named("Test Card")]);

    expect(card.type).toBe(expected);
  });

  it("matches a two-faced card back to the front-face name it was asked about", async () => {
    stubScryfall({
      cards: [
        {
          name: "Delver of Secrets // Insectile Aberration",
          type_line: "Creature — Human Wizard",
          card_faces: [
            { name: "Delver of Secrets", mana_cost: "{U}", oracle_text: "Look at the top card of your library." },
            { name: "Insectile Aberration", oracle_text: "Flying." },
          ],
        },
      ],
    });

    const [delver] = await hydrateScryfallCards([named("Delver of Secrets")]);

    expect(delver.summary).toContain("Look at the top card of your library.");
    expect(delver.summary).toContain("{U}");
  });

  it("asks about at most 75 cards per request", async () => {
    const names = Array.from({ length: 80 }, (_, i) => `Card ${i}`);
    stubScryfall({ cards: [] });

    await hydrateScryfallCards(names.map(named));

    expect(collectionRequests.map((identifiers) => identifiers.length)).toEqual([75, 5]);
  });

  it("does not ask about a card that already carries its text", async () => {
    stubScryfall({ cards: [] });

    await hydrateScryfallCards([{ ...named("Black Lotus"), summary: "already known" }]);

    expect(collectionRequests).toHaveLength(0);
  });

  it("returns every entity untouched when the request fails", async () => {
    stubScryfall({ failCollection: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const entities = [named("Lightning Bolt"), named("Black Lotus")];

    const hydrated = await hydrateScryfallCards(entities);

    expect(hydrated).toEqual(entities);
    warn.mockRestore();
  });

  it("asks about an indexed multi-faced card by a name Scryfall answers to", async () => {
    // Scryfall rejects the combined "A // B" spelling that the catalog uses, so
    // this has to run on an entity the provider built, not a hand-made one.
    stubScryfall({
      names: ["Delver of Secrets // Insectile Aberration"],
      cards: [
        {
          name: "Delver of Secrets // Insectile Aberration",
          type_line: "Creature — Human Wizard // Creature — Human Insect",
          card_faces: [
            { name: "Delver of Secrets", mana_cost: "{U}", oracle_text: "Look at the top card." },
            { name: "Insectile Aberration", oracle_text: "Flying." },
          ],
        },
      ],
    });

    const indexed = await new ScryfallProvider().load();
    const [filled] = await hydrateScryfallCards(indexed);

    expect(collectionRequests).toEqual([[{ name: "Delver of Secrets" }]]);
    expect(filled.summary).toContain("Look at the top card.");
    expect(filled.type).toBe("NPC");
  });

  it("leaves a card Scryfall did not know exactly as it was", async () => {
    stubScryfall({ cards: [{ name: "Lightning Bolt", type_line: "Instant", oracle_text: "Deals 3 damage." }] });
    const unknown = named("Definitely Not A Card");

    const hydrated = await hydrateScryfallCards([named("Lightning Bolt"), unknown]);

    expect(hydrated[0].summary).not.toBe("");
    expect(hydrated[1]).toBe(unknown);
  });
});
