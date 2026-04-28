import type { CardSize } from "../context/ui-settings";

export const CATEGORIES = [
  { id: "display", label: "Display", icon: "grid-outline", iconFocused: "grid" },
  { id: "voice", label: "Voice", icon: "mic-outline", iconFocused: "mic" },
  { id: "data", label: "Sources", icon: "globe-outline", iconFocused: "globe" },
  { id: "files", label: "Files", icon: "document-text-outline", iconFocused: "document-text" },
  { id: "ai", label: "AI Parse", icon: "sparkles-outline", iconFocused: "sparkles" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

export const CARD_SIZE_DESCS: Record<CardSize, string> = {
  S: "up to 4/3",
  M: "up to 3/2",
  L: "up to 2/2",
  XL: "up to 2/1",
};
