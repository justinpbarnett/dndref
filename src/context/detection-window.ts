import { DETECTION_TUNING } from "../entities/detection-tuning";

export const nextDetectionContext = (transcript: string): string =>
  transcript.slice(-DETECTION_TUNING.carryOverChars);

export function buildDetectionInput(previousContext: string, newText: string): string {
  if (!previousContext.trim()) return newText;
  if (!newText.trim()) return previousContext;
  return `${previousContext} ${newText}`;
}
