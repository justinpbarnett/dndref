import { afterEach, describe, it, expect, vi } from "vitest";

import { EntityDetector } from "./detector";

import { slugify, normalizeEntityType, EntityType } from "./index";

describe("EntityDetector", () => {
  const entities = [
    {
      id: "gimble-lock",
      name: "Gimble Lock",
      type: "NPC" as EntityType,
      aliases: ["the bard"],
      summary: "A bard",
      image: undefined,
    },
    {
      id: "iron-fist",
      name: "Iron Fist",
      type: "NPC" as EntityType,
      aliases: [],
      summary: "A fighter",
      image: undefined,
    },
    {
      id: "tavern",
      name: "The Prancing Pony",
      type: "Location" as EntityType,
      aliases: ["pony", "tavern"],
      summary: "A tavern",
      image: undefined,
    },
  ];
  const detector = new EntityDetector(entities);

  it.each([
    ["Gimble", "Gimble Lock"],
    ["the bard", "Gimble Lock"],
    ["The Prancing Pony", "The Prancing Pony"],
  ])("detects %s as %s", (input, expectedName) =>
    expect(detector.detect(input).map((e) => e.name)).toContain(expectedName),
  );

  it.each(["the", "xyzzyplugh", ""])("returns no entities for %p", (input) =>
    expect(detector.detect(input)).toHaveLength(0),
  );

  it("deduplicates multiple matches to same entity", () => {
    expect(detector.detect("Gimble Lock is the bard").map((e) => e.name)).toEqual(["Gimble Lock"]);
  });

  // `minWordChars` filters the transcript side; `minMatchChars` filters the
  // entity side. Both are 4, and they answer different questions.
  it("never searches transcript words below the minimum, whatever the table has been named", () => {
    const shortNamed = new EntityDetector([
      { id: "elm", name: "Elm", type: "Location" as EntityType, aliases: [], summary: "An old elm" },
    ]);

    expect(shortNamed.detect("They camped by the Elm")).toHaveLength(0);
  });

  it("searches multi-word phrases so a name is found mid-sentence", () => {
    expect(detector.detect("they walk into The Prancing Pony at dusk").map((e) => e.name)).toContain(
      "The Prancing Pony",
    );
  });

  // Every other test here builds a detector without naming a mode, which is what
  // pins the default. These pin the other side: the ruleset a table picks
  // decides how its names are matched, in the build it is already running.
  describe("asked for exact matching", () => {
    it("will not answer to a partial name", () => {
      const exact = new EntityDetector(entities, "exact");

      expect(exact.detect("Gimble walks in")).toHaveLength(0);
      expect(exact.detect("Gimble Lock walks in").map((e) => e.name)).toEqual(["Gimble Lock"]);
    });

    it("still answers to a partial name when the same index is matched fuzzily", () => {
      expect(new EntityDetector(entities, "fuzzy").detect("Gimble walks in").map((e) => e.name)).toContain(
        "Gimble Lock",
      );
    });
  });
});

describe("slugify", () => {
  it.each([
    ["GIMBLE", "gimble"],
    ["Gimble Lock", "gimble-lock"],
    ["Test!@#$%", "test"],
  ])("slugifies %s", (input, expected) => expect(slugify(input)).toBe(expected));
});

describe("normalizeEntityType", () => {
  it.each([
    ["npc", "NPC"],
    ["character", "NPC"],
    ["person", "NPC"],
    ["location", "Location"],
    ["place", "Location"],
    ["city", "Location"],
    ["xyz", "Unknown"],
  ] as const)("normalizes %s", (input, expected) => expect(normalizeEntityType(input)).toBe(expected));
});
