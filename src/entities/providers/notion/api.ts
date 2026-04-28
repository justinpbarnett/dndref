import { CORS_PROXY } from "../../../proxy";
import { handleCorsError } from "../../../utils/providers";

const NOTION_VERSION = "2022-06-28";
const NOTION_API_BASE = CORS_PROXY ? `${CORS_PROXY}/notion/v1` : "https://api.notion.com/v1";

type NotionChildrenResponse = { results: any[]; has_more: boolean; next_cursor: string | null };

export class NotionApiClient {
  constructor(private readonly token: string) {}

  async fetchBlocks(blockId: string, depth = 0): Promise<any[]> {
    const all = await this.fetchBlockChildren(blockId);
    if (depth >= 2) return all;

    const withChildren = await Promise.all(
      all.map(async (block) => {
        if (!block.has_children) return [block];
        const children = await this.fetchBlocks(block.id, depth + 1);
        return [block, ...children];
      }),
    );
    return withChildren.flat();
  }

  private async fetchBlockChildren(blockId: string): Promise<any[]> {
    const all: any[] = [];
    let cursor: string | undefined;

    for (;;) {
      const data = await this.fetchChildrenPage(blockId, cursor);
      all.push(...data.results);
      if (!data.has_more) return all;
      cursor = data.next_cursor ?? undefined;
    }
  }

  private async fetchChildrenPage(blockId: string, cursor?: string): Promise<NotionChildrenResponse> {
    const url = `${NOTION_API_BASE}/blocks/${blockId}/children${cursor ? `?start_cursor=${cursor}` : ""}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: this.headers });
    } catch (e) {
      throw handleCorsError(e, "Notion API");
    }
    if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
    return (await res.json()) as NotionChildrenResponse;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Notion-Version": NOTION_VERSION,
    };
  }
}
