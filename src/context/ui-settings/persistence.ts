import { Platform } from "react-native";

import { isCardSize, type CardSize } from "../../card-size-configs";
import {
  createAppDataWriteToken,
  getAppDataItem,
  isAppDataWriteTokenCurrent,
  setAppDataItem,
} from "../../storage/app-data";
import { CARD_SIZE_KEY, COLOR_SCHEME_KEY } from "../../storage/keys";
import { isColorScheme, type ColorScheme } from "./color-scheme-model";

export type StoredUISettings = { cardSize?: CardSize; colorScheme?: ColorScheme };

export async function loadNativeUISettings(): Promise<StoredUISettings | null> {
  if (Platform.OS === "web") return null;
  const token = createAppDataWriteToken();
  try {
    const [rawSize, rawScheme] = await Promise.all([
      getAppDataItem(CARD_SIZE_KEY, token),
      getAppDataItem(COLOR_SCHEME_KEY, token),
    ]);
    return {
      cardSize: isCardSize(rawSize) ? rawSize : undefined,
      colorScheme: isColorScheme(rawScheme) ? rawScheme : undefined,
    };
  } catch (e: unknown) {
    console.warn("[dnd-ref] Failed to load UI preferences:", e);
    return null;
  }
}

export function createCurrentUISettingsToken(): number | null {
  const token = createAppDataWriteToken();
  return isAppDataWriteTokenCurrent(token) ? token : null;
}

export function saveUISetting(key: string, value: string, label: string, token: number): void {
  setAppDataItem(key, value, { token }).catch((e: unknown) => {
    console.warn(`[dnd-ref] Failed to save ${label} preference:`, e);
  });
}
