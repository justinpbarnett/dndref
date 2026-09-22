import { Platform } from "react-native";

import { DeepgramBrowserCaptureAdapter } from "./deepgram-browser";
import { DeepgramNativeCaptureAdapter } from "./deepgram-native";
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
 * so the returned provider is the raw adapter with no wrapper around it. This
 * is the one place the platform decides anything: each Deepgram adapter already
 * carries the name, the key check, and the whole capture lifecycle, so a
 * wrapper over them could only branch on the platform a second time.
 */
export const buildProvider = (
  settings: STTSettings,
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
): STTProvider =>
  Platform.OS !== "web"
    ? new DeepgramNativeCaptureAdapter(settings.deepgramApiKey, onTranscript, onError)
    : settings.provider === "deepgram" && Boolean(settings.deepgramApiKey)
      ? new DeepgramBrowserCaptureAdapter(settings.deepgramApiKey, onTranscript, onError)
      : new WebSpeechProvider(onTranscript, onError);
