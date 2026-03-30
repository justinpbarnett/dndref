import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { DEFAULT_STT_SETTINGS, STT_SETTINGS_KEY, STTProvider, STTSettings } from '../stt/index';
import { DeepgramProvider } from '../stt/deepgram';
import { WebSpeechProvider } from '../stt/web-speech';

export async function loadSettings(): Promise<STTSettings> {
  try {
    const raw = await AsyncStorage.getItem(STT_SETTINGS_KEY);
    if (raw) {
      try {
        return { ...DEFAULT_STT_SETTINGS, ...(JSON.parse(raw) as Partial<STTSettings>) };
      } catch (parseErr) {
        console.warn('[dnd-ref] Failed to parse STT settings, using defaults:', parseErr);
      }
    }
  } catch (e) {
    console.warn('[dnd-ref] Failed to load STT settings, using defaults:', e);
  }
  return DEFAULT_STT_SETTINGS;
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
