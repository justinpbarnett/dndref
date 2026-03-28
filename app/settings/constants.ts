import { CardSize, ColorScheme } from '../../src/context/ui-settings';

export type Category = 'display' | 'voice' | 'data' | 'files' | 'ai';

export const CATEGORIES: { id: Category; label: string; icon: string; iconFocused: string }[] = [
  { id: 'display', label: 'Display', icon: 'grid-outline', iconFocused: 'grid' },
  { id: 'voice', label: 'Voice', icon: 'mic-outline', iconFocused: 'mic' },
  { id: 'data', label: 'Sources', icon: 'globe-outline', iconFocused: 'globe' },
  { id: 'files', label: 'Files', icon: 'document-text-outline', iconFocused: 'document-text' },
  { id: 'ai', label: 'AI Parse', icon: 'sparkles-outline', iconFocused: 'sparkles' },
];

export const CARD_SIZE_LABELS: Record<CardSize, string> = { S: 'S', M: 'M', L: 'L', XL: 'XL' };

export const CARD_SIZE_DESCS: Record<CardSize, string> = {
  S: '4/3 cols', M: '3/2 cols', L: '2/2 cols', XL: '2/1 cols',
};

export const COLOR_SCHEME_LABELS: Record<ColorScheme, string> = {
  system: 'System', dark: 'Dark', light: 'Light',
};
