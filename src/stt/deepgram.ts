import { Platform } from 'react-native';

import { DeepgramBrowserCaptureAdapter } from './deepgram-browser';
import { DeepgramNativeCaptureAdapter } from './deepgram-native';
import { assertDeepgramApiKey } from './deepgram-shared';

import type { STTProvider } from './index';

export class DeepgramProvider implements STTProvider {
  readonly name = 'Deepgram';
  private readonly adapter: STTProvider;

  constructor(
    private readonly apiKey: string,
    onTranscript: (text: string) => void,
    onError: (error: string) => void,
  ) {
    this.adapter = Platform.OS === 'web'
      ? new DeepgramBrowserCaptureAdapter(apiKey, onTranscript, onError)
      : new DeepgramNativeCaptureAdapter(apiKey, onTranscript, onError);
  }

  async start(): Promise<void> {
    assertDeepgramApiKey(this.apiKey);
    await this.adapter.start();
  }

  pause(): void | Promise<void> { return this.adapter.pause(); }
  resume(): void | Promise<void> { return this.adapter.resume(); }
  stop(): void | Promise<void> { return this.adapter.stop(); }
}
