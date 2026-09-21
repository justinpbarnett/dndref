import { Platform } from "react-native";

import { DeepgramProvider } from "./deepgram";
import { WebSpeechProvider } from "./web-speech";
import { createDefaultVoiceSettings, loadVoiceSettings } from "../storage/settings";

import type { STTProvider, STTSettings } from "./index";

export const loadSettings = async (): Promise<STTSettings> =>
  (await loadVoiceSettings()) ?? createDefaultVoiceSettings();

/**
 * Picks the capture adapter for the current platform and settings.
 *
 * Native has no Web Speech API, so it always uses Deepgram. The web build uses
 * Deepgram only when a key is configured. `CaptureSession` owns the lifecycle,
 * so the returned provider is the raw adapter with no wrapper around it.
 */
export const buildProvider = (
  settings: STTSettings,
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
): STTProvider =>
  Platform.OS !== "web" || (settings.provider === "deepgram" && Boolean(settings.deepgramApiKey))
    ? new DeepgramProvider(settings.deepgramApiKey, onTranscript, onError)
    : new WebSpeechProvider(onTranscript, onError);
