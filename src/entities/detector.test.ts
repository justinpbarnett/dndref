import { describe, it, expect } from 'vitest';

import { EntityDetector } from './detector';

import { slugify, normalizeEntityType, EntityType } from './index';

describe('EntityDetector', () => {
  const entities = [
    { id: 'gimble-lock', name: 'Gimble Lock', type: 'NPC' as EntityType, aliases: ['the bard'], summary: 'A bard', image: undefined },
    { id: 'iron-fist', name: 'Iron Fist', type: 'NPC' as EntityType, aliases: [], summary: 'A fighter', image: undefined },
    { id: 'tavern', name: 'The Prancing Pony', type: 'Location' as EntityType, aliases: ['pony', 'tavern'], summary: 'A tavern', image: undefined },
  ];
  const detector = new EntityDetector(entities);

  it('detects entities by exact name match', () => {
    const found = detector.detect('Gimble');
    expect(found.length).toBeGreaterThan(0);
    expect(found.some(e => e.name === 'Gimble Lock')).toBe(true);
  });

  it('detects entities by alias', () => {
    const found = detector.detect('the bard');
    expect(found.length).toBeGreaterThan(0);
    expect(found.some(e => e.name === 'Gimble Lock')).toBe(true);
  });

  it('detects multi-word entity names', () => {
    const found = detector.detect('The Prancing Pony');
    expect(found.length).toBeGreaterThan(0);
    expect(found.some(e => e.name === 'The Prancing Pony')).toBe(true);
  });

  it('does not detect short words (< 4 chars)', () => {
    const found = detector.detect('the');
    expect(found.length).toBe(0);
  });

  it('returns empty for unknown words', () => {
    const found = detector.detect('xyzzyplugh');
    expect(found.length).toBe(0);
  });

  it('handles empty transcript', () => {
    const found = detector.detect('');
    expect(found.length).toBe(0);
  });

  it('deduplicates multiple matches to same entity', () => {
    const found = detector.detect('Gimble Lock is the bard');
    expect(found.length).toBe(1);
    expect(found[0].name).toBe('Gimble Lock');
  });
});

describe('slugify', () => {
  it.each([
    ['GIMBLE', 'gimble'],
    ['Gimble Lock', 'gimble-lock'],
    ['Test!@#$%', 'test'],
  ])('slugifies %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('normalizeEntityType', () => {
  it.each([
    ['npc', 'NPC'], ['character', 'NPC'], ['person', 'NPC'],
    ['location', 'Location'], ['place', 'Location'], ['city', 'Location'],
    ['xyz', 'Unknown'],
  ] as const)('normalizes %s', (input, expected) => {
    expect(normalizeEntityType(input)).toBe(expected);
  });
});
