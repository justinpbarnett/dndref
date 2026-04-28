import { Platform } from "react-native";

import { DeepgramProvider } from "./deepgram";
import { createLateEventSafeSTTProvider } from "./lifecycle-safe-provider";
import { WebSpeechProvider } from "./web-speech";
import { createDefaultVoiceSettings, loadVoiceSettings } from "../storage/app-data";

import type { STTProvider, STTSettings } from "./index";

export const loadSettings = async (): Promise<STTSettings> =>
  (await loadVoiceSettings()) ?? createDefaultVoiceSettings();

export const buildProvider = (
  settings: STTSettings,
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
): STTProvider =>
  createLateEventSafeSTTProvider(
    (safeTranscript, safeError) =>
      Platform.OS !== "web" || (settings.provider === "deepgram" && Boolean(settings.deepgramApiKey))
        ? new DeepgramProvider(settings.deepgramApiKey, safeTranscript, safeError)
        : new WebSpeechProvider(safeTranscript, safeError),
    onTranscript,
    onError,
  );
