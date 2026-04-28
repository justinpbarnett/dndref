import type { Entity } from "../entities";
import { addCard } from "./card-stack";
import type { CardState } from "./session-types";

type DetectionResultsUpdate = {
  detectionKey?: string;
  patch: { cards?: CardState[]; recentDetections?: Entity[] };
};

export function buildDetectionResultsUpdate(
  currentCards: CardState[],
  lastDetectionKey: string,
  detectedEntities: Entity[],
): DetectionResultsUpdate | null {
  if (detectedEntities.length === 0) return null;

  let nextCards = currentCards;
  for (const entity of detectedEntities) nextCards = addCard(nextCards, entity);

  const detectionKey = detectedEntities.map((entity) => entity.id).join(",");
  const cardsChanged = nextCards !== currentCards;
  const recentDetectionsChanged = detectionKey !== lastDetectionKey;
  if (!cardsChanged && !recentDetectionsChanged) return null;

  return {
    detectionKey: recentDetectionsChanged ? detectionKey : undefined,
    patch: {
      ...(cardsChanged ? { cards: nextCards } : {}),
      ...(recentDetectionsChanged ? { recentDetections: detectedEntities } : {}),
    },
  };
}
