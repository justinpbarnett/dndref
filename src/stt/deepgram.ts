import { Platform } from 'react-native';

import { DeepgramBrowserCaptureAdapter } from './deepgram-browser';
import { DeepgramNativeCaptureAdapter } from './deepgram-native';
import { assertDeepgramApiKey } from './deepgram-shared';

import type { STTProvider } from './index';

type TranscriptHandler = (text: string) => void;
type ErrorHandler = (error: string) => void;

export class DeepgramProvider implements STTProvider {
  readonly name = 'Deepgram';
  private readonly adapter: STTProvider;

  constructor(
    private readonly apiKey: string,
    onTranscript: TranscriptHandler,
    onError: ErrorHandler,
  ) {
    this.adapter = createDeepgramCaptureAdapter(apiKey, onTranscript, onError);
  }

  async start(): Promise<void> {
    assertDeepgramApiKey(this.apiKey);
    await this.adapter.start();
  }

  pause(): void | Promise<void> { return this.adapter.pause(); }
  resume(): void | Promise<void> { return this.adapter.resume(); }
  stop(): void | Promise<void> { return this.adapter.stop(); }
}

function createDeepgramCaptureAdapter(
  apiKey: string,
  onTranscript: TranscriptHandler,
  onError: ErrorHandler,
): STTProvider {
  if (Platform.OS === 'web') {
    return new DeepgramBrowserCaptureAdapter(apiKey, onTranscript, onError);
  }
  return new DeepgramNativeCaptureAdapter(apiKey, onTranscript, onError);
}
