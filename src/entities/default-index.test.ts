import { beforeAll, describe, expect, it } from "vitest";

import { DETECTION_TUNING } from "./detection-tuning";
import { EntityDetector } from "./detector";
import { MarkdownProvider } from "./providers/markdown";
import { WOTC_SRD_NAMES } from "./wotc-srd-names";
import { SAMPLE_WORLD } from "../sample-world/index";

import type { Entity, EntityType } from "./index";

const letterCount = (value: string): number => value.replace(/[^a-z]/gi, "").length;

const srdEntity = (name: string, index: number): Entity => ({
  id: `srd-${index}`,
  name,
  type: "NPC" as EntityType,
  aliases: [],
  summary: "",
});

describe("default index", () => {
  let detector: EntityDetector;
  let entities: Entity[];

  beforeAll(async () => {
    const sample = await new MarkdownProvider(SAMPLE_WORLD, "Sample World").load();
    const srd = WOTC_SRD_NAMES.map(srdEntity);
    entities = [...sample, ...srd];
    detector = new EntityDetector(entities);
  });

  const names = (transcript: string): string[] => detector.detect(transcript).map((entity) => entity.name).sort();

  it("does not promote gate or throne into unrelated magic items", () => {
    expect(names("we entered Ironspire through the eastern gate")).not.toContain("Cubic Gate");
    expect(names("Valdrath the Undying approaches the throne")).not.toContain("Dwarven Thrower");
  });

  it("keeps the issue's repro sentence to the monsters that were named", () => {
    expect(
      names("What's the plan? The guard at the gate asks who we are, while the mage casts a spell."),
    ).toEqual(["Guard", "Mage"]);
  });

  it.each([
    "I want to order another round",
    "I was a blacksmith.",
    "the tavern keeper poured us another round",
    "what's the plan",
    "we should ride the horse to the throne room",
    "pass me a potion and the gold",
    "the wizard casts fire at the bridge",
    "she was awakened by the noise",
    "ride",
    "horse",
    "potion",
    "gold",
    "asks",
    "while",
    "throne",
    "room",
    "order",
    "blacksmith",
    "purple",
    "weapon",
    "winter",
  ])("raises nothing for %s", (transcript) => {
    expect(names(transcript)).toEqual([]);
  });

  it("hears the mage in grey mage and the person who goes by that name", () => {
    expect(names("grey mage")).toEqual(["Mage", "Malachar the Grey"]);
  });

  it("does not spend the possessive sentence on Crown of Ashes", () => {
    expect(names("Gorm's daughter is still missing. Valdrath's phylactery is hidden.")).not.toContain(
      "Crown of Ashes",
    );
  });

  it("lets a later fix teach short monster names without unrelated cards", () => {
    expect(names("the orc attacks").filter((name) => name !== "Orc")).toEqual([]);
    expect(names("the spy listens").filter((name) => name !== "Spy")).toEqual([]);
  });

  it.each([
    ["the blacksmith", "Gorm Ironfist"],
    ["the Order", "The Dawnwarden Order"],
    ["the blade", "The Sundering Blade"],
    ["the ruins", "Thornwall"],
    ["Valdrath the Undying approaches the throne", "Valdrath the Undying"],
    ["we entered Ironspire through the eastern gate", "Ironspire Fortress"],
    ["Seraphine briefed us on the mission", "Lady Seraphine Voss"],
    ["Spell Scroll", "Spell Scroll"],
    ["Killer Whale", "Killer Whale"],
    ["gelatinous", "Gelatinous Cube"],
    ["tyrannosaurus", "Tyrannosaurus Rex"],
    ["Assasin", "Assassin"],
    ["Planitar", "Planetar"],
  ])("detects %s as %s", (transcript, expected) => {
    expect(names(transcript)).toContain(expected);
  });

  it("detects every loaded name that is long enough to be searched", () => {
    const missed = entities
      .filter((entity) => letterCount(entity.name) >= DETECTION_TUNING.minWordChars)
      .filter((entity) => !detector.detect(entity.name).some((hit) => hit.id === entity.id))
      .map((entity) => entity.name);

    expect(missed).toEqual([]);
  });
});
