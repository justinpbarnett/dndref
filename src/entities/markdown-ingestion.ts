import type { Entity, EntityIndex } from "./index";

type MarkdownBlock = { name: string; body: string };
type MarkdownEntityRecord = Partial<Record<"name" | "type" | "aliases" | "summary", unknown>>;
type MarkdownEntityNormalizer = (record: MarkdownEntityRecord) => Entity | null;

export function ingestMarkdownContentWithNormalizer(content: string, normalizeEntity: MarkdownEntityNormalizer): EntityIndex {
  const blocks = getHeadingBlocks(content);
  const sourceBlocks = blocks.length > 0 ? blocks : getFallbackBlock(content);

  return sourceBlocks
    .map((block) => normalizeMarkdownBlock(block, normalizeEntity))
    .filter((entity): entity is Entity => entity !== null);
}

function normalizeMarkdownBlock(block: MarkdownBlock, normalizeEntity: MarkdownEntityNormalizer): Entity | null {
  const name = cleanHeading(block.name);
  let rawType = "";
  let rawAliases = "";
  const summaryLines: string[] = [];

  for (const line of block.body.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "---") continue;

    const field = parseField(trimmed);
    if (field?.key === "type") {
      rawType = field.value;
      continue;
    }
    if (field?.key === "aliases") {
      rawAliases = field.value;
      continue;
    }

    if (!trimmed && summaryLines.length === 0) continue;
    summaryLines.push(line);
  }

  return normalizeEntity({
    name,
    type: rawType,
    aliases: rawAliases,
    summary: summaryLines.join("\n"),
  });
}

function getHeadingBlocks(content: string): MarkdownBlock[] {
  const headingRe = /^(#{1,3})\s+(.+?)\s*#*\s*$/gm;
  const matches = Array.from(content.matchAll(headingRe));

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    return { name: match[2], body: content.slice(start, matches[index + 1]?.index ?? content.length) };
  });
}

function getFallbackBlock(content: string): MarkdownBlock[] {
  const lines = content.trim().split("\n");
  const name = lines.shift()?.trim() ?? "";
  return name ? [{ name, body: lines.join("\n") }] : [];
}

const cleanHeading = (name: string) => name.replace(/\*\*/g, "").trim();

function parseField(line: string): { key: string; value: string } | null {
  const match = line.match(/^(?:[-*]\s*)?(?:\*\*)?([^:*]+):(?:\*\*)?\s*(.+)$/);
  if (!match) return null;

  return { key: match[1].replace(/\*/g, "").trim().toLowerCase(), value: match[2].trim() };
}
