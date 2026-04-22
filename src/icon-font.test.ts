import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { IONICONS_WEB_FONT, getIoniconsFontSource } from './icon-font';

describe('Ionicons font source', () => {
  it('uses the local public font only on web', () => {
    const nativeFont = 42;

    expect(getIoniconsFontSource('web', nativeFont)).toBe(IONICONS_WEB_FONT);
    expect(getIoniconsFontSource('ios', nativeFont)).toBe(nativeFont);
    expect(getIoniconsFontSource('android', nativeFont)).toBe(nativeFont);
  });

  it('serves the web font from public assets', () => {
    const publicFont = join(process.cwd(), 'public/fonts/Ionicons.ttf');
    const packageFont = join(
      process.cwd(),
      'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
    );

    expect(IONICONS_WEB_FONT).toBe('/fonts/Ionicons.ttf');
    expect(existsSync(publicFont)).toBe(true);
    expect(readFileSync(publicFont)).toEqual(readFileSync(packageFont));
  });

  it('is registered by the root layout for web and native', () => {
    const layout = readFileSync(join(process.cwd(), 'app/_layout.tsx'), 'utf8');

    expect(layout).toContain('src:url("${IONICONS_WEB_FONT}") format("truetype")');
    expect(layout).toContain("Platform.OS === 'web'");
    expect(layout).toContain('ExpoIonicons.font.ionicons');
  });
});
