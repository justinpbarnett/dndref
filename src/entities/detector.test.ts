import { describe, it, expect } from 'vitest';

import { EntityDetector } from './detector';

import { slugify, normalizeEntityType, EntityType } from './index';

describe('EntityDetector', () => {
  const entities = [
    { id: 'gimble-lock', name: 'Gimble Lock', type: 'NPC' as EntityType, aliases: ['the bard'], summary: 'A bard', image: undefined },
    { id: 'iron-fist', name: 'Iron Fist', type: 'NPC' as EntityType, aliases: [], summary: 'A fighter', image: undefined },
    { id: 'tavern', name: 'The Prancing Pony', type: 'Location' as EntityType, aliases: ['pony', 'tavern'], summary: 'A tavern', image: undefined },
  ];

  it('detects entities by exact name match', () => {
    const detector = new EntityDetector(entities);
    const found = detector.detect('Gimble');
    expect(found.length).toBeGreaterThan(0);
    expect(found.some(e => e.name === 'Gimble Lock')).toBe(true);
  });

  it('detects entities by alias', () => {
    const detector = new EntityDetector(entities);
    const found = detector.detect('the bard');
    expect(found.length).toBeGreaterThan(0);
    expect(found.some(e => e.name === 'Gimble Lock')).toBe(true);
  });

  it('detects multi-word entity names', () => {
    const detector = new EntityDetector(entities);
    const found = detector.detect('The Prancing Pony');
    expect(found.length).toBeGreaterThan(0);
    expect(found.some(e => e.name === 'The Prancing Pony')).toBe(true);
  });

  it('does not detect short words (< 4 chars)', () => {
    const detector = new EntityDetector(entities);
    const found = detector.detect('the');
    expect(found.length).toBe(0);
  });

  it('returns empty for unknown words', () => {
    const detector = new EntityDetector(entities);
    const found = detector.detect('xyzzyplugh');
    expect(found.length).toBe(0);
  });

  it('handles empty transcript', () => {
    const detector = new EntityDetector(entities);
    const found = detector.detect('');
    expect(found.length).toBe(0);
  });

  it('deduplicates multiple matches to same entity', () => {
    const detector = new EntityDetector(entities);
    const found = detector.detect('Gimble Lock is the bard');
    expect(found.length).toBe(1);
    expect(found[0].name).toBe('Gimble Lock');
  });
});

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('GIMBLE')).toBe('gimble');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('Gimble Lock')).toBe('gimble-lock');
  });

  it('removes non-alphanumeric characters', () => {
    expect(slugify('Test!@#$%')).toBe('test');
  });
});

describe('normalizeEntityType', () => {
  it('recognizes NPC variations', () => {
    expect(normalizeEntityType('npc')).toBe('NPC');
    expect(normalizeEntityType('character')).toBe('NPC');
    expect(normalizeEntityType('person')).toBe('NPC');
  });

  it('recognizes location variations', () => {
    expect(normalizeEntityType('location')).toBe('Location');
    expect(normalizeEntityType('place')).toBe('Location');
    expect(normalizeEntityType('city')).toBe('Location');
  });

  it('defaults to Unknown for unknown types', () => {
    expect(normalizeEntityType('xyz')).toBe('Unknown');
  });
});
