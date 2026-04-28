export { extractEntitiesFromLog } from './vvd-entity-extraction.mjs';
export { analyzeLog } from './vvd-log-analysis.mjs';

export function toMarkdown(entity) {
  const aliases = entity.aliases?.length ? `**Aliases:** ${entity.aliases.join(', ')}\n` : '';
  return `# ${entity.name}\n**Type:** ${entity.type}\n${aliases}\n${entity.summary}\n\n---\n\n`;
}

