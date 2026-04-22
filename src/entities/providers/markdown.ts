import { Entity, EntityIndex, WorldDataProvider, normalizeEntityType, slugify } from '../index';

interface MarkdownBlock {
  name: string;
  body: string;
}

function parseMarkdown(content: string): EntityIndex {
  const blocks = getHeadingBlocks(content);
  const sourceBlocks = blocks.length > 0 ? blocks : getFallbackBlock(content);

  return sourceBlocks.map((block) => {
    const name = cleanHeading(block.name);
    if (!name) return null;

    const id = slugify(name);
    let type = normalizeEntityType('');
    let aliases: string[] = [];
    const summaryLines: string[] = [];

    for (const line of block.body.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '---') continue;

      const field = parseField(trimmed);
      if (field?.key === 'type') {
        type = normalizeEntityType(field.value);
        continue;
      }
      if (field?.key === 'aliases') {
        aliases = field.value.split(/[,;|]/).map((a) => a.trim()).filter(Boolean);
        continue;
      }

      if (!trimmed && summaryLines.length === 0) continue;
      summaryLines.push(line);
    }

    return { id, name, type, aliases, summary: summaryLines.join('\n').trim() };
  }).filter((e): e is Entity => e !== null && e.name.length > 0);
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

export class MarkdownProvider implements WorldDataProvider {
  private content: string;
  private label: string;

  constructor(content: string, label = 'Markdown') {
    this.content = content;
    this.label = label;
  }

  async load(): Promise<EntityIndex> {
    return parseMarkdown(this.content);
  }

  getName(): string {
    return this.label;
  }
}
