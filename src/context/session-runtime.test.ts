import { describe, expect, it } from 'vitest';

import type { Entity } from '../entities';
import { SessionRuntime, type SessionRuntimeDetector } from './session-runtime';

function makeEntity(id: string, name: string): Entity {
  return {
    id,
    name,
    type: 'NPC',
    aliases: [],
    summary: `${name} summary`,
  };
}

class FakeDetector implements SessionRuntimeDetector {
  inputs: string[] = [];

  constructor(private readonly respond: (input: string) => Entity[]) {}

  detect(input: string): Entity[] {
    this.inputs.push(input);
    return this.respond(input);
  }
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

describe('SessionRuntime', () => {
  it('carries active transcript context so split entity names are detected', () => {
    const redOakKeep = makeEntity('red-oak-keep', 'Red Oak Keep');
    const detector = new FakeDetector((input) => (
      normalizeSpaces(input).includes('Red Oak Keep') ? [redOakKeep] : []
    ));
    const runtime = new SessionRuntime();

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript('The party reached Red');
    runtime.processTranscript();
    runtime.appendTranscript('Oak Keep before sunset');
    runtime.processTranscript();

    const lastInput = detector.inputs[detector.inputs.length - 1];
    expect(normalizeSpaces(lastInput)).toContain('Red Oak Keep before sunset');
    expect(runtime.getSnapshot().cards.map((card) => card.entity.name)).toEqual(['Red Oak Keep']);
    expect(runtime.getSnapshot().recentDetections).toEqual([redOakKeep]);
  });

  it('suppresses duplicate detections without replacing recent detections or cards', () => {
    const valdrath = makeEntity('valdrath', 'Valdrath the Undying');
    const detector = new FakeDetector((input) => (
      input.includes('Valdrath') ? [valdrath] : []
    ));
    const runtime = new SessionRuntime();

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript('Valdrath spoke first');
    runtime.processTranscript();
    const firstCards = runtime.getSnapshot().cards;
    const firstRecentDetections = runtime.getSnapshot().recentDetections;

    runtime.appendTranscript('then Valdrath spoke again');
    runtime.processTranscript();

    expect(runtime.getSnapshot().cards).toBe(firstCards);
    expect(runtime.getSnapshot().cards).toHaveLength(1);
    expect(runtime.getSnapshot().recentDetections).toBe(firstRecentDetections);
  });

  it('adds detected entities to the card stack and recent detections', () => {
    const valdrath = makeEntity('valdrath', 'Valdrath the Undying');
    const malachar = makeEntity('malachar', 'Malachar the Grey');
    const detector = new FakeDetector(() => [valdrath, malachar]);
    const runtime = new SessionRuntime();

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript('Valdrath summoned Malachar to the fortress');
    runtime.processTranscript();

    expect(runtime.getSnapshot().cards.map((card) => card.entity.id).sort()).toEqual(['malachar', 'valdrath']);
    expect(runtime.getSnapshot().cards).toHaveLength(2);
    expect(runtime.getSnapshot().cards.every((card) => !card.pinned)).toBe(true);
    expect(runtime.getSnapshot().recentDetections).toEqual([valdrath, malachar]);
  });
});
