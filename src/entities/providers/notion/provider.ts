import { EntityIndex, WorldDataProvider } from "../../index";
import { MarkdownProvider } from "../markdown";
import { NotionApiClient } from "./api";
import { blocksToMarkdown } from "./markdown";
export { extractNotionId } from "./id";

export class NotionProvider implements WorldDataProvider {
  readonly name = "Notion";
  private readonly api: NotionApiClient;

  constructor(
    private token: string,
    private pageIds: string[],
  ) {
    this.api = new NotionApiClient(token);
  }

  async load(): Promise<EntityIndex> {
    const results = await Promise.allSettled(this.pageIds.map((id) => this.loadPage(id)));
    results.forEach((r, i) => {
      if (r.status === "rejected") console.warn(`[dnd-ref] Notion page ${this.pageIds[i]} failed:`, r.reason);
    });
    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  }

  private async loadPage(pageId: string): Promise<EntityIndex> {
    const blocks = await this.api.fetchBlocks(pageId);
    const text = blocksToMarkdown(blocks);
    return new MarkdownProvider(text, "Notion").load();
  }

}
