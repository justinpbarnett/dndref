import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { IONICONS_CDN, getIoniconsFontSource } from './icon-font';

describe('Ionicons font source', () => {
  it('uses the CDN workaround only on web', () => {
    const nativeFont = 42;

    expect(getIoniconsFontSource('web', nativeFont)).toBe(IONICONS_CDN);
    expect(getIoniconsFontSource('ios', nativeFont)).toBe(nativeFont);
    expect(getIoniconsFontSource('android', nativeFont)).toBe(nativeFont);
  });

  it('keeps the web CDN font version aligned with the installed icon glyph map', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'node_modules/@expo/vector-icons/package.json'), 'utf8')) as { version: string };

    expect(IONICONS_CDN).toContain(`@expo/vector-icons@${pkg.version}/`);
  });

  it('is used by the root layout font loader', () => {
    const layout = readFileSync(join(process.cwd(), 'app/_layout.tsx'), 'utf8');

    expect(layout).toContain('getIoniconsFontSource(Platform.OS, Ionicons.font.ionicons)');
  });
});
