import { Entity, EntityType, normalizeEntityType, slugify } from "../index";

export type IngestedEntityRecord = Partial<
  Record<"name" | "type" | "aliases" | "summary" | "description" | "image", unknown>
>;
export type NormalizeIngestedEntityOptions = { idPrefix?: string; idNamespace?: string | number; index?: number };

export function normalizeIngestedEntity(
  record: IngestedEntityRecord,
  options: NormalizeIngestedEntityOptions = {},
): Entity | null {
  const name = normalizeNonEmptyString(record.name);
  if (!name) return null;

  const entity: Entity = {
    id: buildEntityId(name, options),
    name,
    type: normalizeIngestedEntityType(record.type),
    aliases: normalizeAliases(record.aliases),
    summary: normalizeSummary(record.summary, record.description),
  };

  const image = normalizeNonEmptyString(record.image);
  if (image) entity.image = image;

  return entity;
}

export const isIngestedEntityRecord = (value: unknown): value is IngestedEntityRecord =>
  value !== null && typeof value === "object";

const normalizeNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" ? value.trim() || null : null;
const normalizeIngestedEntityType = (value: unknown): EntityType =>
  normalizeEntityType(typeof value === "string" ? value : "");

function normalizeAliases(value: unknown): string[] {
  if (typeof value === "string") return splitAliasString(value);

  if (!Array.isArray(value)) return [];

  return value
    .filter((alias): alias is string => typeof alias === "string")
    .map((alias) => alias.trim())
    .filter(Boolean);
}

const splitAliasString = (value: string): string[] =>
  value
    .split(/[,;|]/)
    .map((alias) => alias.trim())
    .filter(Boolean);

function normalizeSummary(summary: unknown, description: unknown): string {
  const value = typeof summary === "string" ? summary : description;
  return typeof value === "string" ? value.trim() : "";
}

const buildEntityId = (name: string, options: NormalizeIngestedEntityOptions): string =>
  [options.idPrefix, slugify(name), options.idNamespace, options.index]
    .filter((part) => part !== undefined && part !== "")
    .join("-");
