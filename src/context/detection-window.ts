export const DETECTION_CONTEXT_CHARS = 80;

export function nextDetectionContext(transcript: string): string {
  return transcript.slice(-DETECTION_CONTEXT_CHARS);
}

export function buildDetectionInput(previousContext: string, newText: string): string {
  if (!previousContext.trim()) return newText;
  if (!newText.trim()) return previousContext;
  return `${previousContext} ${newText}`;
}
