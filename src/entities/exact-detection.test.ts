import { describe, expect, it } from "vitest";

import { exactDetection } from "./exact-detection";

import type { Entity } from "./index";

const card = (name: string, aliases: string[] = []): Entity => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  type: "Item",
  aliases,
  summary: "",
});

describe("exact name detection", () => {
  it("finds a name spoken in the middle of a sentence", () => {
    const detect = exactDetection([card("Lightning Bolt")]);

    expect(detect("okay I'll cast Lightning Bolt at your face").map((e) => e.name)).toEqual(["Lightning Bolt"]);
  });

  it("takes the longest name, so a shorter name inside it does not also fire", () => {
    const detect = exactDetection([card("Lightning"), card("Lightning Bolt")]);

    expect(detect("I'll cast Lightning Bolt").map((e) => e.name)).toEqual(["Lightning Bolt"]);
  });

  it("names an entity once however often it is spoken", () => {
    const detect = exactDetection([card("Sol Ring")]);

    expect(detect("Sol Ring into another Sol Ring").map((e) => e.name)).toEqual(["Sol Ring"]);
  });

  it("answers to a nickname the entity carries as an alias", () => {
    const detect = exactDetection([card("Swords to Plowshares", ["Swords"])]);

    expect(detect("just Swords the commander").map((e) => e.name)).toEqual(["Swords to Plowshares"]);
  });

  it("matches a hyphenated name the way a transcript spells it out", () => {
    const detect = exactDetection([card("Eight-and-a-Half-Tails")]);

    expect(detect("blocking with Eight and a Half Tails").map((e) => e.name)).toEqual(["Eight-and-a-Half-Tails"]);
  });

  it("matches a possessive name whether or not the transcript kept the apostrophe", () => {
    const detect = exactDetection([card("Gaea's Cradle")]);

    expect(detect("tapping Gaeas Cradle").map((e) => e.name)).toEqual(["Gaea's Cradle"]);
    expect(detect("tapping Gaea's Cradle").map((e) => e.name)).toEqual(["Gaea's Cradle"]);
  });

  // Each of these entities is one the fuzzy detector returned for the sentence
  // beneath it, measured against Scryfall's 38,906-card corpus. Staying silent
  // on table talk that never named anything is the whole point of matching
  // exactly, so the noise is written down rather than described.
  it.each([
    ["my girlfriend said she might come by around eight thirty", ["Mightstone", "Comeuppance", "Groundbreaker"]],
    ["I think we should order pizza after this turn", ["Turnabout", "Thinking Cap", "Ordered Migration"]],
    ["yeah that was the game where everyone ganged up on me", ["Gamekeeper", "Thatcher Revolt", "Fanged Flames"]],
  ])("stays silent on table talk that named nothing: %s", (talk, names) =>
    expect(exactDetection(names.map((name) => card(name)))(talk)).toEqual([]),
  );
});
