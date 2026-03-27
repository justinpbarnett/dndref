import { Entity, EntityIndex, EntityType, WorldDataProvider, slugify } from '../index';

function parseMarkdown(content: string): EntityIndex {
  const blocks = content.split(/^# /m).filter(Boolean);

  return blocks.map((block) => {
    const lines = block.trim().split('\n');
    const name = lines[0].trim();
    if (!name) return null;

    const id = slugify(name);
    const VALID_TYPES = new Set<EntityType>(['Location', 'NPC', 'Faction', 'Item', 'Unknown']);
    let type: EntityType = 'Unknown';
    let aliases: string[] = [];
    const summaryLines: string[] = [];
    let inSummary = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line === '---') break;

      const typeMatch = line.match(/^\*\*Type:\*\*\s*(.+)/);
      const aliasMatch = line.match(/^\*\*Aliases:\*\*\s*(.+)/);

      if (!inSummary && typeMatch) {
        const raw = typeMatch[1].trim() as EntityType;
        type = VALID_TYPES.has(raw) ? raw : 'Unknown';
      } else if (!inSummary && aliasMatch) {
        aliases = aliasMatch[1].split(',').map((a) => a.trim()).filter(Boolean);
      } else {
        if (line.trim()) inSummary = true;
        summaryLines.push(line);
      }
    }

    return { id, name, type, aliases, summary: summaryLines.join('\n').trim() };
  }).filter((e): e is Entity => e !== null && e.name.length > 0);
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
