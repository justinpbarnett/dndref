export function extractNotionId(urlOrId: string): string {
  const cleaned = urlOrId.trim();
  const uuid = cleaned.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuid) return uuid[0].replace(/-/g, "");
  const hex = cleaned.match(/[0-9a-f]{32}/i);
  if (hex) return hex[0];
  return cleaned;
}
