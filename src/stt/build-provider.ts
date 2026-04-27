import { Platform } from 'react-native';

import { createDefaultVoiceSettings, loadVoiceSettings } from '../storage/app-data';
import { DeepgramProvider } from '../stt/deepgram';
import { STTProvider, STTSettings } from '../stt/index';
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
    return new DeepgramProvider(settings.deepgramApiKey, onTranscript, onError);
  }
  if (settings.provider === 'deepgram' && settings.deepgramApiKey) {
    return new DeepgramProvider(settings.deepgramApiKey, onTranscript, onError);
  }
  return new WebSpeechProvider(onTranscript, onError);
}
