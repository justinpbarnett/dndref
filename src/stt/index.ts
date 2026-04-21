export interface STTProvider {
  readonly name: string;
  start(): Promise<void>;
  pause(): void | Promise<void>;
  resume(): void | Promise<void>;
  stop(): void | Promise<void>;
}

export interface STTSettings {
  provider: 'web-speech' | 'deepgram';
  deepgramApiKey: string;
}

export const DEFAULT_STT_SETTINGS: STTSettings = {
  provider: 'web-speech',
  deepgramApiKey: '',
};

export const STT_SETTINGS_KEY = '@dnd-ref/stt-settings';
