export type EntityType = "Location" | "NPC" | "Faction" | "Item" | "Unknown";

export type Entity = Record<"id" | "name" | "summary", string> & {
  type: EntityType;
  aliases: string[];
  details?: string;
  image?: string;
};

export type EntityIndex = Entity[];

export type WorldDataProvider = { readonly name: string; load(): Promise<EntityIndex> };

/**
 * What a detection strategy is: a transcript in, the entities it named out.
 * Both the fuzzy and the exact strategy are built as one of these, which is
 * how `EntityDetector` can pick between them without knowing either.
 */
export type TranscriptMatcher = (transcript: string) => Entity[];

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
export const stripHtml = (s: string): string =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

export function normalizeEntityType(raw: string): EntityType {
  const s = String(raw).toLowerCase();
  if (s.includes("npc") || s.includes("character") || s.includes("person")) return "NPC";
  if (s.includes("location") || s.includes("place") || s.includes("region") || s.includes("city")) return "Location";
  if (s.includes("faction") || s.includes("organization") || s.includes("group") || s.includes("guild"))
    return "Faction";
  if (s.includes("item") || s.includes("artifact") || s.includes("object") || s.includes("weapon")) return "Item";
  return "Unknown";
}
