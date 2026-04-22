import { describe, expect, it } from 'vitest';

import { MarkdownProvider } from './markdown';

describe('MarkdownProvider', () => {
  it('parses h2 and h3 headings as separate entities', async () => {
    const content = `
## Moonlit Bazaar
Type: place
Aliases: Night Market; Bazaar

Open only under the new moon.

### Captain Aria
**Type:** character
**Aliases:** Aria, the captain

Commands the east watch.
`;

    const entities = await new MarkdownProvider(content, 'Imported Doc').load();

    expect(entities.map((e) => e.name)).toEqual(['Moonlit Bazaar', 'Captain Aria']);
  });

  it('normalizes imported type variants and alias separators', async () => {
    const content = `
## Moonlit Bazaar
Type: place
Aliases: Night Market; Bazaar

Open only under the new moon.

### Captain Aria
**Type:** character
**Aliases:** Aria, the captain

Commands the east watch.
`;

    const entities = await new MarkdownProvider(content, 'Imported Doc').load();

    expect(entities).toEqual([
      {
        id: 'moonlit-bazaar',
        name: 'Moonlit Bazaar',
        type: 'Location',
        aliases: ['Night Market', 'Bazaar'],
        summary: 'Open only under the new moon.',
      },
      {
        id: 'captain-aria',
        name: 'Captain Aria',
        type: 'NPC',
        aliases: ['Aria', 'the captain'],
        summary: 'Commands the east watch.',
      },
    ]);
  });
});
