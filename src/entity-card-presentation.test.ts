import { describe, expect, test, vi } from "vitest";

// The palettes live beside the font families, which read Platform.
vi.mock("react-native", () => ({ Platform: { OS: "web", select: (choices: Record<string, unknown>) => choices.web } }));

import type { CardState } from "./context/session-types";
import { deriveEntityCardPresentation } from "./entity-card-presentation";
import { DARK, LIGHT } from "./theme";

const makeCard = (overrides: Partial<CardState["entity"]> = {}, pinned = false): CardState => ({
  instanceId: "card-1",
  pinned,
  entity: {
    id: "ironspire",
    name: "Ironspire Fortress",
    type: "Location",
    aliases: [],
    summary: "Ancient dwarven stronghold. Seven levels deep.",
    image: undefined,
    ...overrides,
  },
});

const present = (entity: Partial<CardState["entity"]> = {}, pinned = false) =>
  deriveEntityCardPresentation({ card: makeCard(entity, pinned), colors: DARK });

describe("deriveEntityCardPresentation", () => {
  test("represents type, accent color, image, and actions for unpinned cards", () => {
    expect(present({ image: "https://example.com/ironspire.png" })).toEqual({
      instanceId: "card-1",
      name: "Ironspire Fortress",
      type: "Location",
      typeLabel: "LOCATION",
      accentColor: DARK.location,
      pinned: false,
      imageUri: "https://example.com/ironspire.png",
      bulletMarker: ">",
      summaryBullets: ["Ancient dwarven stronghold", "Seven levels deep"],
      detailBullets: ["Ancient dwarven stronghold.", "Seven levels deep."],
      actions: {
        pinToggle: { kind: "pin", accessibilityLabel: "Pin", iconName: "bookmark-outline" },
        dismiss: { kind: "dismiss", accessibilityLabel: "Dismiss", iconName: "close" },
      },
    });
  });

  test("represents pinned state with unpin action and absent image state", () => {
    const entity = {
      id: "valdrath",
      name: "Valdrath the Undying",
      type: "NPC" as const,
      summary: "",
      details: "Full lich details.",
      image: "",
    };

    expect(present(entity, true)).toEqual({
      instanceId: "card-1",
      name: "Valdrath the Undying",
      type: "NPC",
      typeLabel: "NPC",
      accentColor: DARK.npc,
      pinned: true,
      imageUri: null,
      bulletMarker: ">",
      summaryBullets: [],
      detailBullets: ["Full lich details."],
      actions: {
        pinToggle: { kind: "unpin", accessibilityLabel: "Unpin", iconName: "bookmark" },
        dismiss: { kind: "dismiss", accessibilityLabel: "Dismiss", iconName: "close" },
      },
    });
  });

  test("accents the card from the entity type against the active scheme", () => {
    expect(present({ type: "Faction" }).accentColor).toBe(DARK.faction);
    expect(deriveEntityCardPresentation({ card: makeCard({ type: "Item" }), colors: LIGHT }).accentColor).toBe(
      LIGHT.item,
    );
  });

  test.each([
    [
      "The Lich King. Undead sorcerer! His phylactery remains hidden.",
      ["The Lich King", "Undead sorcerer", "His phylactery remains hidden"],
    ],
    ["One. Two. Three. Four. Five. Six. Seven.", ["One", "Two", "Three", "Four", "Five"]],
    [
      "Who guards the armory? Gorm knows: level 4. Wait--listen!",
      ["Who guards the armory", "Gorm knows: level 4", "Wait--listen"],
    ],
    ["", []],
    ["   \n  ", []],
  ])("trims the summary to card bullets %#", (summary, bullets) =>
    expect(present({ summary }).summaryBullets).toEqual(bullets),
  );

  test("preserves rarity, prose sentences, and markdown bullets as detail bullets", () => {
    const details = [
      "Rare. If you hold this beetle-shaped medallion in your hand for 1 round, an inscription appears on its surface revealing its magical nature. It provides two benefits while it is on your person:",
      "* You have advantage on saving throws against spells.",
      "* The scarab has 12 charges.",
    ].join("\n");

    expect(present({ details }).detailBullets).toEqual([
      "Rare.",
      "If you hold this beetle-shaped medallion in your hand for 1 round, an inscription appears on its surface revealing its magical nature.",
      "It provides two benefits while it is on your person:",
      "You have advantage on saving throws against spells.",
      "The scarab has 12 charges.",
    ]);
  });
});
