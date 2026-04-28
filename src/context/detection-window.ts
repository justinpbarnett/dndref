export const nextDetectionContext = (transcript: string): string => transcript.slice(-80);

export function buildDetectionInput(previousContext: string, newText: string): string {
  if (!previousContext.trim()) return newText;
  if (!newText.trim()) return previousContext;
  return `${previousContext} ${newText}`;
}
