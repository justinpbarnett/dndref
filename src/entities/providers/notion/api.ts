import { fetchOutbound } from "../../../proxy";

const NOTION_VERSION = "2022-06-28";

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
    const path = `/v1/blocks/${blockId}/children${cursor ? `?start_cursor=${cursor}` : ""}`;
    const res = await fetchOutbound("notion", path, { sourceName: "Notion API", headers: this.headers });
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
