import type { Colors } from "./color-types";
import type { CardState } from "./context/session-types";
import type { EntityType } from "./entities/index";
import { typeAccent } from "./type-accent";

export interface EntityCardPinTogglePresentation {
  kind: "pin" | "unpin";
  accessibilityLabel: "Pin" | "Unpin";
  iconName: "bookmark" | "bookmark-outline";
}
export type EntityCardPresentation = Record<
  "instanceId" | "name" | "typeLabel" | "accentColor" | "bulletMarker",
  string
> & {
  type: EntityType;
  pinned: boolean;
  imageUri: string | null;
  /** The card face: the summary, trimmed to at most five short lines. */
  summaryBullets: string[];
  /** The details modal: the full text, one bullet per sentence or list item. */
  detailBullets: string[];
  actions: {
    pinToggle: EntityCardPinTogglePresentation;
    dismiss: { kind: "dismiss"; accessibilityLabel: "Dismiss"; iconName: "close" };
  };
};

export type DeriveEntityCardPresentationInput = { card: CardState; colors: Colors };

const extractEntityCardSummaryBullets = (summary: string): string[] =>
  extractEntityDetailBullets(summary)
    .map((bullet) => bullet.replace(/[.!?]$/, "").trim())
    .slice(0, 5);

const extractEntityDetailBullets = (details: string): string[] =>
  details
    .split("\n")
    .flatMap((line) => {
      const trimmed = line.trim();
      if (!trimmed) return [];

      const markdownBullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (markdownBullet) return [markdownBullet[1].trim()];

      return trimmed
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
    })
    .filter((bullet) => bullet.length > 0);

const derivePinTogglePresentation = (pinned: boolean): EntityCardPinTogglePresentation =>
  pinned
    ? { kind: "unpin", accessibilityLabel: "Unpin", iconName: "bookmark" }
    : { kind: "pin", accessibilityLabel: "Pin", iconName: "bookmark-outline" };

/**
 * Everything the card face and the details modal need in order to show one
 * detected entity. Both read it, so both show the same name, accent and text.
 */
export function deriveEntityCardPresentation({
  card,
  colors,
}: DeriveEntityCardPresentationInput): EntityCardPresentation {
  const { entity, pinned } = card;

  return {
    instanceId: card.instanceId,
    name: entity.name,
    type: entity.type,
    typeLabel: entity.type.toUpperCase(),
    accentColor: typeAccent(entity.type, colors),
    pinned,
    imageUri: entity.image || null,
    bulletMarker: ">",
    summaryBullets: extractEntityCardSummaryBullets(entity.summary),
    detailBullets: extractEntityDetailBullets(entity.details || entity.summary),
    actions: {
      pinToggle: derivePinTogglePresentation(pinned),
      dismiss: { kind: "dismiss", accessibilityLabel: "Dismiss", iconName: "close" },
    },
  };
}
