export const IONICONS_WEB_FONT = '/fonts/Ionicons.ttf';

export function getIoniconsFontSource<T>(platformOs: string, bundledFont: T): string | T {
  return platformOs === 'web' ? IONICONS_WEB_FONT : bundledFont;
}
