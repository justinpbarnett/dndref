import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('runtime package manifest', () => {
  it('declares direct runtime imports as direct dependencies', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };

    for (const name of ['@expo/vector-icons', 'expo-font', 'expo-file-system']) {
      expect(pkg.dependencies).toHaveProperty(name);
    }
  });
});
