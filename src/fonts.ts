import { Platform } from "react-native";

export const F = {
  display: Platform.select({ web: "'Cinzel', Georgia, 'Times New Roman', serif", ios: "Georgia", default: "serif" }),
  body: Platform.select({ web: "'EB Garamond', Georgia, serif", ios: "Georgia", default: undefined }),
  mono: Platform.select({ web: "'Courier Prime', 'Courier New', monospace", ios: "Menlo", default: "monospace" }),
};
