import { EntityIndex } from "./index";
import { ingestMarkdownContentWithNormalizer } from "./markdown-ingestion";
import {
  isIngestedEntityRecord,
  normalizeIngestedEntity,
  type IngestedEntityRecord,
  type NormalizeIngestedEntityOptions,
} from "./ingestion/normalization";

export { normalizeIngestedEntity, type IngestedEntityRecord, type NormalizeIngestedEntityOptions } from "./ingestion/normalization";

export type UploadedWorldData = { name: string; content: string };
export type UploadedWorldDataIngestionOptions = {
  idNamespace?: string | number;
  onJsonParseError?: (error: unknown) => void;
};

export const ingestMarkdownContent = (content: string): EntityIndex =>
  ingestMarkdownContentWithNormalizer(content, normalizeIngestedEntity);

/**
 * Every world source ends here: raw records in, entities out. Records without a
 * name are dropped, and whatever aliases a source carries are picked up by the
 * one normalizer rather than each source deciding for itself.
 */
export function ingestEntityRecords(
  items: readonly unknown[],
  options: Omit<NormalizeIngestedEntityOptions, "index"> = {},
): EntityIndex {
  const entities: EntityIndex = [];

  for (const item of items) {
    if (!isIngestedEntityRecord(item)) continue;

    const entity = normalizeIngestedEntity(item, { ...options, index: entities.length });
    if (entity) entities.push(entity);
  }

  return entities;
}

export function ingestJsonContent(
  content: string,
  options: Omit<NormalizeIngestedEntityOptions, "index"> = {},
): EntityIndex {
  const data = JSON.parse(content) as unknown;
  return ingestEntityRecords(Array.isArray(data) ? data : [], options);
}

export function ingestUploadedFile(
  upload: UploadedWorldData,
  options: UploadedWorldDataIngestionOptions = {},
): EntityIndex {
  if (isJsonUploadName(upload.name)) {
    try {
      return ingestJsonContent(upload.content, {
        idPrefix: "upload",
        idNamespace: options.idNamespace ?? Date.now(),
      });
    } catch (error) {
      options.onJsonParseError?.(error);
    }
  }

  return ingestMarkdownContent(upload.content);
}

export const isJsonUploadName = (name: string): boolean => name.toLowerCase().endsWith(".json");
