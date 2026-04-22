export const IONICONS_CDN =
  'https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.1.1/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf';

export function getIoniconsFontSource<T>(platformOs: string, bundledFont: T): string | T {
  return platformOs === 'web' ? IONICONS_CDN : bundledFont;
}
