import { describe, expect, it } from 'vitest';

import {
  ingestJsonContent,
  ingestMarkdownContent,
  normalizeIngestedEntity,
} from './ingestion';

describe('world data ingestion', () => {
  it('normalizes entity type, ids, aliases, and summaries for shared ingested records', () => {
    expect(normalizeIngestedEntity({
      name: ' The Argent Key! ',
      type: 'artifact weapon',
      aliases: [' key ', '', 7, 'silver key'],
      description: '  Opens the Moon Door.  ',
    }, { idPrefix: 'upload', idNamespace: 42, index: 3 })).toEqual({
      id: 'upload-the-argent-key-42-3',
      name: 'The Argent Key!',
      type: 'Item',
      aliases: ['key', 'silver key'],
      summary: 'Opens the Moon Door.',
    });
  });

  it('keeps markdown/text parsing behavior while using shared normalization', () => {
    const entities = ingestMarkdownContent(`
## Moonlit Bazaar
Type: place
Aliases: Night Market; Bazaar | moon market

Open only under the new moon.

### Captain Aria
**Type:** character
**Aliases:** Aria, the captain

Commands the east watch.
`);

    expect(entities).toEqual([
      {
        id: 'moonlit-bazaar',
        name: 'Moonlit Bazaar',
        type: 'Location',
        aliases: ['Night Market', 'Bazaar', 'moon market'],
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

  it('ingests JSON arrays with upload-style ids and description fallback summaries', () => {
    const entities = ingestJsonContent(JSON.stringify([
      {
        name: 'Lady Seraphine Voss',
        type: 'person',
        aliases: ['Seraphine', ' Lady Voss '],
        description: 'Spymaster of the Dawnwarden Order.',
      },
      { name: '', type: 'npc' },
      { nope: 'missing name' },
    ]), { idPrefix: 'upload', idNamespace: 1234 });

    expect(entities).toEqual([
      {
        id: 'upload-lady-seraphine-voss-1234-0',
        name: 'Lady Seraphine Voss',
        type: 'NPC',
        aliases: ['Seraphine', 'Lady Voss'],
        summary: 'Spymaster of the Dawnwarden Order.',
      },
    ]);
  });
});
