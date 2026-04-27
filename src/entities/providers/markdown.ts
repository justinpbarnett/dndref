import { EntityIndex, WorldDataProvider } from '../index';
import { ingestMarkdownContent } from '../ingestion';

export class MarkdownProvider implements WorldDataProvider {
  private content: string;
  private label: string;

  constructor(content: string, label = 'Markdown') {
    this.content = content;
    this.label = label;
  }

  async load(): Promise<EntityIndex> {
    return ingestMarkdownContent(this.content);
  }

  getName(): string {
    return this.label;
  }
}
