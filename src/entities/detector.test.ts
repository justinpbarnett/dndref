import { describe, it, expect } from "vitest";

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
