import {
  Entity,
  EntityIndex,
  EntityType,
  normalizeEntityType,
  slugify,
} from './index';

const JSON_UPLOAD_EXTENSION = '.json';
const UPLOAD_ENTITY_ID_PREFIX = 'upload';

interface MarkdownBlock {
  name: string;
  body: string;
}

export interface IngestedEntityRecord {
  name?: unknown;
  type?: unknown;
  aliases?: unknown;
  summary?: unknown;
  description?: unknown;
  image?: unknown;
}

export interface NormalizeIngestedEntityOptions {
  idPrefix?: string;
  idNamespace?: string | number;
  index?: number;
}

export interface UploadedWorldData {
  name: string;
  content: string;
}

export interface UploadedWorldDataIngestionOptions {
  idNamespace?: string | number;
  onJsonParseError?: (error: unknown) => void;
}

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

export function ingestMarkdownContent(content: string): EntityIndex {
  const blocks = getHeadingBlocks(content);
  const sourceBlocks = blocks.length > 0 ? blocks : getFallbackBlock(content);

  return sourceBlocks
    .map((block) => normalizeMarkdownBlock(block))
    .filter((entity): entity is Entity => entity !== null);
}

export function ingestJsonContent(
  content: string,
  options: Omit<NormalizeIngestedEntityOptions, 'index'> = {},
): EntityIndex {
  const data = JSON.parse(content) as unknown;
  const items = Array.isArray(data) ? data : [];
  const entities: EntityIndex = [];

  for (const item of items) {
    if (!isIngestedEntityRecord(item)) continue;

    const entity = normalizeIngestedEntity(item, {
      ...options,
      index: entities.length,
    });
    if (entity) entities.push(entity);
  }

  return entities;
}

export function ingestUploadedFile(
  upload: UploadedWorldData,
  options: UploadedWorldDataIngestionOptions = {},
): EntityIndex {
  if (isJsonUploadName(upload.name)) {
    try {
      return ingestJsonContent(upload.content, {
        idPrefix: UPLOAD_ENTITY_ID_PREFIX,
        idNamespace: options.idNamespace ?? Date.now(),
      });
    } catch (error) {
      options.onJsonParseError?.(error);
    }
  }

  return ingestMarkdownContent(upload.content);
}

export function isJsonUploadName(name: string): boolean {
  return name.toLowerCase().endsWith(JSON_UPLOAD_EXTENSION);
}

function normalizeMarkdownBlock(block: MarkdownBlock): Entity | null {
  const name = cleanHeading(block.name);
  let rawType = '';
  let rawAliases = '';
  const summaryLines: string[] = [];

  for (const line of block.body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '---') continue;

    const field = parseField(trimmed);
    if (field?.key === 'type') {
      rawType = field.value;
      continue;
    }
    if (field?.key === 'aliases') {
      rawAliases = field.value;
      continue;
    }

    if (!trimmed && summaryLines.length === 0) continue;
    summaryLines.push(line);
  }

  return normalizeIngestedEntity({
    name,
    type: rawType,
    aliases: rawAliases,
    summary: summaryLines.join('\n'),
  });
}

function getHeadingBlocks(content: string): MarkdownBlock[] {
  const headingRe = /^(#{1,3})\s+(.+?)\s*#*\s*$/gm;
  const matches = Array.from(content.matchAll(headingRe));

  return matches.map((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[i + 1]?.index ?? content.length;
    return { name: match[2], body: content.slice(start, end) };
  });
}

function getFallbackBlock(content: string): MarkdownBlock[] {
  const lines = content.trim().split('\n');
  const name = lines.shift()?.trim() ?? '';
  return name ? [{ name, body: lines.join('\n') }] : [];
}

function cleanHeading(name: string): string {
  return name.replace(/\*\*/g, '').trim();
}

function parseField(line: string): { key: string; value: string } | null {
  const match = line.match(/^(?:[-*]\s*)?(?:\*\*)?([^:*]+):(?:\*\*)?\s*(.+)$/);
  if (!match) return null;

  return {
    key: match[1].replace(/\*/g, '').trim().toLowerCase(),
    value: match[2].trim(),
  };
}

function isIngestedEntityRecord(value: unknown): value is IngestedEntityRecord {
  return value !== null && typeof value === 'object';
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  return normalized || null;
}

function normalizeIngestedEntityType(value: unknown): EntityType {
  return normalizeEntityType(typeof value === 'string' ? value : '');
}

function normalizeAliases(value: unknown): string[] {
  if (typeof value === 'string') {
    return splitAliasString(value);
  }

  if (!Array.isArray(value)) return [];

  return value
    .filter((alias): alias is string => typeof alias === 'string')
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function splitAliasString(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function normalizeSummary(summary: unknown, description: unknown): string {
  const value = typeof summary === 'string' ? summary : description;
  return typeof value === 'string' ? value.trim() : '';
}

function buildEntityId(name: string, options: NormalizeIngestedEntityOptions): string {
  const parts: Array<string | number> = [];
  if (options.idPrefix) parts.push(options.idPrefix);
  parts.push(slugify(name));
  if (options.idNamespace !== undefined && options.idNamespace !== '') {
    parts.push(options.idNamespace);
  }
  if (options.index !== undefined) parts.push(options.index);

  return parts.join('-');
}
