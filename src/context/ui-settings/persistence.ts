import { Platform } from "react-native";

import { isCardSize, type CardSize } from "../../card-size-configs";
import { openAppData } from "../../storage/app-data";
import { CARD_SIZE_KEY, COLOR_SCHEME_KEY } from "../../storage/keys";
import { isColorScheme, type ColorScheme } from "./color-scheme-model";

export type StoredUISettings = { cardSize?: CardSize; colorScheme?: ColorScheme };

export async function loadNativeUISettings(): Promise<StoredUISettings | null> {
  if (Platform.OS === "web") return null;
  const appData = openAppData();
  try {
    const [rawSize, rawScheme] = await Promise.all([appData.read(CARD_SIZE_KEY), appData.read(COLOR_SCHEME_KEY)]);
    return {
      cardSize: isCardSize(rawSize) ? rawSize : undefined,
      colorScheme: isColorScheme(rawScheme) ? rawScheme : undefined,
    };
  } catch (e: unknown) {
    console.warn("[dnd-ref] Failed to load UI preferences:", e);
    return null;
  }
}

/**
 * Saves one preference and reports whether the app should show it.
 *
 * Returns false when a "delete all data" wipe is under way. The caller then
 * leaves its own state alone, so the screen never shows a preference that
 * storage refused.
 */
export function saveUISetting(key: string, value: string, label: string): boolean {
  const appData = openAppData();
  if (!appData.isCurrent()) return false;

  appData.write(key, value).catch((e: unknown) => {
    console.warn(`[dnd-ref] Failed to save ${label} preference:`, e);
  });
  return true;
}
