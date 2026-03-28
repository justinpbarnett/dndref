import { EntityIndex, WorldDataProvider } from '../index';
import { MarkdownProvider } from './markdown';
import { CORS_PROXY } from '../../proxy';
import { handleCorsError } from '../../utils/providers';

const NOTION_API = CORS_PROXY ? `${CORS_PROXY}/notion/v1` : 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export class NotionProvider implements WorldDataProvider {
  readonly name = 'Notion';
  private token: string;
  private pageIds: string[];

  constructor(token: string, pageIds: string[]) {
    this.token = token;
    this.pageIds = pageIds;
  }

  async load(): Promise<EntityIndex> {
    const results = await Promise.allSettled(this.pageIds.map((id) => this.loadPage(id)));
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.warn(`[dnd-ref] Notion page ${this.pageIds[i]} failed:`, r.reason);
    });
    return results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
  }

  getName(): string { return this.name; }

  private async loadPage(pageId: string): Promise<EntityIndex> {
    const blocks = await this.fetchBlocks(pageId);
    const text = blocksToMarkdown(blocks);
    return new MarkdownProvider(text, 'Notion').load();
  }

  private async fetchBlocks(blockId: string, depth = 0): Promise<any[]> {
    const headers = {
      Authorization: `Bearer ${this.token}`,
      'Notion-Version': NOTION_VERSION,
    };

    const all: any[] = [];
    let cursor: string | undefined;

    for (;;) {
      const url = `${NOTION_API}/blocks/${blockId}/children${cursor ? `?start_cursor=${cursor}` : ''}`;
      let res: Response;
      try {
        res = await fetch(url, { headers });
      } catch (e) {
        throw handleCorsError(e, 'Notion API');
      }
      if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
      const data = await res.json() as { results: any[]; has_more: boolean; next_cursor: string | null };
      all.push(...data.results);
      if (!data.has_more) break;
      cursor = data.next_cursor ?? undefined;
    }

    if (depth < 2) {
      const withChildren = await Promise.all(
        all.map(async (block) => {
          if (!block.has_children) return [block];
          const children = await this.fetchBlocks(block.id, depth + 1);
          return [block, ...children];
        }),
      );
      return withChildren.flat();
    }

    return all;
  }
}

function richText(rts: any[]): string {
  return (rts ?? []).map((rt: any) => rt.plain_text ?? '').join('');
}

function blocksToMarkdown(blocks: any[]): string {
  return blocks.map((block) => {
    const content = block[block.type];
    const text = richText(content?.rich_text ?? []);
    switch (block.type) {
      case 'heading_1': return `# ${text}`;
      case 'heading_2': return `## ${text}`;
      case 'heading_3': return `### ${text}`;
      case 'bulleted_list_item': return `- ${text}`;
      case 'numbered_list_item': return `1. ${text}`;
      case 'quote':
      case 'callout':
      case 'paragraph': return text;
      case 'divider': return '---';
      default: return text;
    }
  }).filter(Boolean).join('\n');
}

export function extractNotionId(urlOrId: string): string {
  const cleaned = urlOrId.trim();
  const uuid = cleaned.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuid) return uuid[0].replace(/-/g, '');
  const hex = cleaned.match(/[0-9a-f]{32}/i);
  if (hex) return hex[0];
  return cleaned;
}
