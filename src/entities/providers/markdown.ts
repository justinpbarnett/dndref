import { EntityIndex, WorldDataProvider } from '../index';
import { ingestMarkdownContent } from '../ingestion';

export class MarkdownProvider implements WorldDataProvider {
  constructor(private content: string, private label = 'Markdown') {}

  async load(): Promise<EntityIndex> { return ingestMarkdownContent(this.content); }
  getName(): string { return this.label; }
}
