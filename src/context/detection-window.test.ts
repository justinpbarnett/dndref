import { describe, expect, it } from 'vitest';

import {
  buildDetectionInput,
  nextDetectionContext,
} from './detection-window';
import { EntityType } from '../entities';
import { EntityDetector } from '../entities/detector';

describe('detection transcript windows', () => {
  const entities = [
    {
      id: 'red-oak-keep',
      name: 'Red Oak Keep',
      type: 'Location' as EntityType,
      aliases: [],
      summary: 'A keep under an old red oak.',
    },
  ];

  it('carries previous active transcript into the next detection input', () => {
    const detector = new EntityDetector(entities);
    const firstSlice = 'The party reached Red';
    const secondSlice = 'Oak Keep before sunset';

    const carried = nextDetectionContext(firstSlice);
    const detectionInput = buildDetectionInput(carried, secondSlice);

    expect(detectionInput).toBe('The party reached Red Oak Keep before sunset');
    expect(detector.detect(detectionInput).map((e) => e.name)).toContain('Red Oak Keep');
  });

  it('can intentionally drop context so paused transcript is not carried after resume', () => {
    const skippedWhilePaused = nextDetectionContext('The party reached Red');
    const detectionInput = buildDetectionInput('', 'Oak Keep before sunset');

    expect(skippedWhilePaused).toContain('Red');
    expect(detectionInput).toBe('Oak Keep before sunset');
  });
});
