import { describe, expect, test } from "vitest";

import type { CardState } from "./context/session-types";
import {
  deriveEntityCardPresentation,
  extractEntityCardSummaryBullets,
  extractEntityDetailBullets,
} from "./entity-card-presentation";

const makeCard = (overrides: Partial<CardState> = {}): CardState => ({
  instanceId: "card-1",
  pinned: false,
  entity: {
    id: "ironspire",
    name: "Ironspire Fortress",
    type: "Location",
    aliases: [],
    summary: "Ancient dwarven stronghold. Seven levels deep.",
    image: undefined,
  },
  ...overrides,
});

describe("extractEntityCardSummaryBullets", () => {
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
  ])("extracts display bullets from summary %#", (summary, bullets) =>
    expect(extractEntityCardSummaryBullets(summary)).toEqual(bullets),
  );

  test.each(["", "   \n  "])("returns no bullets for empty summary %#", (summary) =>
    expect(extractEntityCardSummaryBullets(summary)).toEqual([]),
  );
});

describe("extractEntityDetailBullets", () => {
  test("preserves rarity, prose sentences, and markdown bullets as display bullets", () => {
    expect(
      extractEntityDetailBullets(
        [
          "Rare. If you hold this beetle-shaped medallion in your hand for 1 round, an inscription appears on its surface revealing its magical nature. It provides two benefits while it is on your person:",
          "* You have advantage on saving throws against spells.",
          "* The scarab has 12 charges.",
        ].join("\n"),
      ),
    ).toEqual([
      "Rare.",
      "If you hold this beetle-shaped medallion in your hand for 1 round, an inscription appears on its surface revealing its magical nature.",
      "It provides two benefits while it is on your person:",
      "You have advantage on saving throws against spells.",
      "The scarab has 12 charges.",
    ]);
  });
});

describe("deriveEntityCardPresentation", () => {
  test("represents type, accent color, image, and actions for unpinned cards", () => {
    const card = makeCard({
      entity: {
        id: "ironspire",
        name: "Ironspire Fortress",
        type: "Location",
        aliases: [],
        summary: "Ancient dwarven stronghold. Seven levels deep.",
        image: "https://example.com/ironspire.png",
      },
    });

    expect(deriveEntityCardPresentation({ card, accentColor: "#2878b0" })).toEqual({
      instanceId: "card-1",
      name: "Ironspire Fortress",
      type: "Location",
      typeLabel: "LOCATION",
      accentColor: "#2878b0",
      pinned: false,
      imageUri: "https://example.com/ironspire.png",
      bulletMarker: ">",
      summaryBullets: ["Ancient dwarven stronghold", "Seven levels deep"],
      details: "Ancient dwarven stronghold. Seven levels deep.",
      actions: {
        pinToggle: { kind: "pin", accessibilityLabel: "Pin", iconName: "bookmark-outline" },
        dismiss: { kind: "dismiss", accessibilityLabel: "Dismiss", iconName: "close" },
      },
    });
  });

  test("represents pinned state with unpin action and absent image state", () => {
    const card = makeCard({
      pinned: true,
      entity: {
        id: "valdrath",
        name: "Valdrath the Undying",
        type: "NPC",
        aliases: [],
        summary: "",
        details: "Full lich details.",
        image: "",
      },
    });

    expect(deriveEntityCardPresentation({ card, accentColor: "#45b882" })).toEqual({
      instanceId: "card-1",
      name: "Valdrath the Undying",
      type: "NPC",
      typeLabel: "NPC",
      accentColor: "#45b882",
      pinned: true,
      imageUri: null,
      bulletMarker: ">",
      summaryBullets: [],
      details: "Full lich details.",
      actions: {
        pinToggle: { kind: "unpin", accessibilityLabel: "Unpin", iconName: "bookmark" },
        dismiss: { kind: "dismiss", accessibilityLabel: "Dismiss", iconName: "close" },
      },
    });
  });
});
