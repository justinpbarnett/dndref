import { Platform } from 'react-native';

import { createDefaultVoiceSettings, loadVoiceSettings } from '../storage/app-data';
import { DeepgramProvider } from '../stt/deepgram';
import { STTProvider, STTSettings } from '../stt/index';
import { createLateEventSafeSTTProvider } from '../stt/lifecycle-safe-provider';
import { WebSpeechProvider } from '../stt/web-speech';

export async function loadSettings(): Promise<STTSettings> {
  return (await loadVoiceSettings()) ?? createDefaultVoiceSettings();
}

export function buildProvider(
  settings: STTSettings,
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
): STTProvider {
  if (Platform.OS !== 'web') {
    return createLateEventSafeSTTProvider(
      (safeTranscript, safeError) => new DeepgramProvider(settings.deepgramApiKey, safeTranscript, safeError),
      onTranscript,
      onError,
    );
  }
  if (settings.provider === 'deepgram' && settings.deepgramApiKey) {
    return createLateEventSafeSTTProvider(
      (safeTranscript, safeError) => new DeepgramProvider(settings.deepgramApiKey, safeTranscript, safeError),
      onTranscript,
      onError,
    );
  }
  return createLateEventSafeSTTProvider(
    (safeTranscript, safeError) => new WebSpeechProvider(safeTranscript, safeError),
    onTranscript,
    onError,
  );
}
