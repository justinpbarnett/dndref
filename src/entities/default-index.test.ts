import { beforeAll, describe, expect, it } from "vitest";

import { englishWords } from "./common-words";
import { DETECTION_TUNING } from "./detection-tuning";
import { EntityDetector } from "./detector";
import { ingestMarkdownContent } from "./ingestion";
import { MarkdownProvider } from "./providers/markdown";
import { WOTC_SRD_NAMES } from "./wotc-srd-names";
import { SAMPLE_WORLD } from "../sample-world/index";

import type { Entity, EntityType } from "./index";

const letterCount = (value: string): number => value.replace(/[^a-z]/gi, "").length;

function editDistance(left: string, right: string): number {
  const scores = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0));
  for (let row = 0; row < scores.length; row++) scores[row][0] = row;
  for (let col = 0; col < scores[0].length; col++) scores[0][col] = col;
  for (let row = 1; row < scores.length; row++) {
    for (let col = 1; col < scores[0].length; col++) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      scores[row][col] = Math.min(scores[row - 1][col] + 1, scores[row][col - 1] + 1, scores[row - 1][col - 1] + cost);
      if (row > 1 && col > 1 && left[row - 1] === right[col - 2] && left[row - 2] === right[col - 1]) {
        scores[row][col] = Math.min(scores[row][col], scores[row - 2][col - 2] + 1);
      }
    }
  }
  return scores[left.length][right.length];
}

function oneEditShortNames(detector: EntityDetector, word: string): string[] {
  const found: string[] = [];
  for (const entity of detector.detect(word)) {
    const forms = [entity.name, ...entity.aliases].flatMap((name) => spokenForms(name));
    if (forms.some((form) => form.split(" ").includes(word))) continue;
    for (const token of new Set(forms.flatMap((form) => form.split(" ")))) {
      if (token.length >= DETECTION_TUNING.minFuzzyChars || token.length < DETECTION_TUNING.minWordChars) continue;
      if (token[0] !== word[0]) continue;
      const maxLetters = Math.max(token.length, word.length);
      if (Math.min(token.length, word.length) / maxLetters < DETECTION_TUNING.minLengthRatio) continue;
      if (editDistance(token, word) !== 1) continue;
      found.push(entity.name);
      break;
    }
  }
  return found;
}

const bonusSuffix = (): RegExp => new RegExp(DETECTION_TUNING.bonusSuffix, "gi");

const normalizeSpoken = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['\u2019]/g, "")
    .replace(bonusSuffix(), " ")
    .replace(/[^a-z]+/g, " ")
    .trim();

const spokenForms = (name: string): string[] => {
  const forms = new Set<string>();
  const stripped = name.replace(bonusSuffix(), " ");
  forms.add(normalizeSpoken(stripped.replace(/\([^)]*\)/g, " ")));
  for (const match of stripped.matchAll(/\(([^)]*)\)/g)) {
    for (const part of match[1].split("/")) forms.add(normalizeSpoken(part));
  }
  if (!stripped.includes("(") && stripped.includes("/")) {
    for (const part of stripped.split("/")) forms.add(normalizeSpoken(part));
  }
  const adult = new RegExp(`^${DETECTION_TUNING.unqualifiedDragonAge} ([a-z]+) dragon$`, "i").exec(name);
  if (adult) forms.add(`${adult[1].toLowerCase()} dragon`);
  forms.delete("");
  return [...forms];
};

const srdEntity = (name: string, index: number): Entity => ({
  id: `srd-${index}`,
  name,
  type: "NPC" as EntityType,
  aliases: [],
  summary: "",
  catalog: true,
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
    "winter",
  ])("raises nothing for %s", (transcript) => {
    expect(names(transcript)).toEqual([]);
  });

  it.each([
    "I gave the order to retreat and keep the formation compact.",
    "The crown of the hill is bare, and the ruins below are older than the town.",
    "A blade of grass is stuck to the grey cloak.",
    "in the order they arrived",
    "the order",
    "compact",
    "the crown",
    "the grey",
    "the ruins",
    "the blade",
    "the blacksmith",
    "the fortress",
    "the spire",
    "the vale",
    "the compact",
  ])("raises nothing for the ordinary alias in %s", (transcript) => {
    expect(names(transcript)).toEqual([]);
  });

  it("hears grey mage as the person, not the monster inside that name", () => {
    expect(names("grey mage")).toEqual(["Malachar the Grey"]);
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
    ["Gorm", "Gorm Ironfist"],
    ["Dawnwarden Order", "The Dawnwarden Order"],
    ["Sundering Blade", "The Sundering Blade"],
    ["Thornwall", "Thornwall"],
    ["Malachar", "Malachar the Grey"],
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

  it.each([
    ["wand of the war mage", "Wand of the War Mage, +1, +2, or +3"],
    ["Wand of the War Mage, +1, +2, or +3", "Wand of the War Mage, +1, +2, or +3"],
    ["weapon", "Weapon, +1, +2, or +3"],
    ["+1 weapon", "Weapon, +1, +2, or +3"],
    ["deep gnome", "Deep Gnome (Svirfneblin)"],
    ["svirfneblin", "Deep Gnome (Svirfneblin)"],
    ["stone of good luck", "Stone of Good Luck (Luckstone)"],
    ["luckstone", "Stone of Good Luck (Luckstone)"],
    ["succubus", "Succubus/Incubus"],
    ["incubus", "Succubus/Incubus"],
    ["will-o-wisp", "Will-o'-Wisp"],
    ["will o wisp", "Will-o'-Wisp"],
    ["will-o'-wisp", "Will-o'-Wisp"],
  ])("speaks %s as %s", (transcript, expected) => {
    expect(names(transcript)).toEqual([expected]);
  });

  it("does not add the shorter name inside a longer one", () => {
    expect(names("dire wolf")).toEqual(["Dire Wolf"]);
    expect(names("bandit captain")).toEqual(["Bandit Captain"]);
    expect(names("wolf")).toEqual(["Wolf"]);
    expect(names("bandit")).toEqual(["Bandit"]);
  });

  it.each([
    "germ",
    "gore",
    "gory",
    "form",
    "make",
    "made",
    "maeg",
    "card",
    "yard",
    "gaurd",
    "pond",
    "poin",
    "draw",
    "word",
    "boat",
  ])("does not turn the everyday word %s into a short name", (transcript) => {
    expect(names(transcript)).toEqual([]);
  });

  it.each([
    "she wore a grey cloak",
    "tie the ropes and climb",
    "play the harp",
    "hardy folk",
    "don't drown the captive",
    "ogle",
    "lama",
    "kale",
    "keel",
    "mire",
    "liar",
    "lire",
    "bran",
  ])("does not one-edit the ordinary wording in %s", (transcript) => {
    expect(names(transcript)).toEqual([]);
  });

  it("does not one-edit any four- to six-letter English word into a short name", () => {
    const short = new EntityDetector(
      ingestMarkdownContent(`
# Gorm
**Type:** NPC

# Kael
**Type:** NPC

# Vex
**Type:** NPC

# Lira
**Type:** NPC

# Tor
**Type:** NPC

# Bryn
**Type:** NPC

# Mira
**Type:** NPC
`),
    );
    const misses: string[] = [];
    for (const word of englishWords()) {
      for (const name of oneEditShortNames(detector, word)) misses.push(`default ${word} -> ${name}`);
      for (const name of oneEditShortNames(short, word)) misses.push(`notes ${word} -> ${name}`);
      if (misses.length >= 30) break;
    }
    expect(misses).toEqual([]);
  }, 120_000);

  it.each([
    ["Gorn", "Gorm Ironfist"],
    ["Gormm", "Gorm Ironfist"],
    ["Goorm", "Gorm Ironfist"],
    ["Valdrat", "Valdrath the Undying"],
    ["Valdrathh", "Valdrath the Undying"],
  ])("hears the misheard short name %s as %s", (transcript, expected) => {
    expect(names(transcript)).toEqual([expected]);
  });

  it.each(["solar", "noble", "scout", "pony"])("still hears the one-word catalog name %s", (transcript) => {
    const title = transcript[0].toUpperCase() + transcript.slice(1);
    expect(names(transcript)).toEqual([title]);
  });

  it.each(["black", "blue", "brass", "bronze", "copper", "gold", "green", "red", "silver", "white"])(
    "treats %s dragon as the adult",
    (color) => {
      const title = color[0].toUpperCase() + color.slice(1);
      expect(names(`${color} dragon`)).toEqual([`Adult ${title} Dragon`]);
    },
  );

  it("keeps an age that was actually spoken", () => {
    expect(names("Young Red Dragon")).toEqual(["Young Red Dragon"]);
    expect(names("ancient white dragon")).toEqual(["Ancient White Dragon"]);
    expect(names("red dragon wyrmling")).toEqual(["Red Dragon Wyrmling"]);
    expect(names("half red dragon veteran")).toEqual(["Half-Red Dragon Veteran"]);
  });

  it("detects every loaded name and the form a person would say", () => {
    const missed: string[] = [];
    for (const entity of entities) {
      const named =
        letterCount(entity.name) >= DETECTION_TUNING.minWordChars &&
        detector.detect(entity.name).some((hit) => hit.id === entity.id);
      if (!named && letterCount(entity.name) >= DETECTION_TUNING.minWordChars) missed.push(entity.name);
      for (const form of spokenForms(entity.name)) {
        if (letterCount(form) < DETECTION_TUNING.minWordChars) continue;
        if (!detector.detect(form).some((hit) => hit.id === entity.id)) missed.push(`${form} -> ${entity.name}`);
      }
    }
    expect(missed).toEqual([]);
  });
});
