import { Platform } from 'react-native';

import { DeepgramProvider } from './deepgram';
import { createLateEventSafeSTTProvider, type STTProviderFactory } from './lifecycle-safe-provider';
import { WebSpeechProvider } from './web-speech';
import { createDefaultVoiceSettings, loadVoiceSettings } from '../storage/app-data';

import type { STTProvider, STTSettings } from './index';

export async function loadSettings(): Promise<STTSettings> {
  return (await loadVoiceSettings()) ?? createDefaultVoiceSettings();
}

export function buildProvider(
  settings: STTSettings,
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
): STTProvider {
  return createLateEventSafeSTTProvider(
    createProviderFactory(settings),
    onTranscript,
    onError,
  );
}

function createProviderFactory(settings: STTSettings): STTProviderFactory {
  if (shouldUseDeepgram(settings)) {
    return (safeTranscript, safeError) => new DeepgramProvider(
      settings.deepgramApiKey,
      safeTranscript,
      safeError,
    );
  }

  return (safeTranscript, safeError) => new WebSpeechProvider(safeTranscript, safeError);
}

function shouldUseDeepgram(settings: STTSettings): boolean {
  return Platform.OS !== 'web'
    || (settings.provider === 'deepgram' && Boolean(settings.deepgramApiKey));
}
