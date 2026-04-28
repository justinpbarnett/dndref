const richText = (rts: any[]) => (rts ?? []).map((rt: any) => rt.plain_text ?? "").join("");

const notionBlockToMarkdown = (block: any): string => {
  const content = block[block.type];
  const text = richText(content?.rich_text ?? []);
  switch (block.type) {
    case "heading_1":
      return `# ${text}`;
    case "heading_2":
      return `## ${text}`;
    case "heading_3":
      return `### ${text}`;
    case "bulleted_list_item":
      return `- ${text}`;
    case "numbered_list_item":
      return `1. ${text}`;
    case "quote":
    case "callout":
    case "paragraph":
      return text;
    case "divider":
      return "---";
    default:
      return text;
  }
};

export const blocksToMarkdown = (blocks: any[]): string => blocks.map(notionBlockToMarkdown).filter(Boolean).join("\n");
