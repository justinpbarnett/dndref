import * as FileSystem from 'expo-file-system/legacy';

import {
  createNativeAudioRecorder,
  releaseNativeAudioRecorder,
  requestNativeRecordingAccess,
  type NativeAudioRecorder,
} from './native-audio';

import {
  assertDeepgramApiKey,
  DEEPGRAM_HTTP_URL,
  DEEPGRAM_PARAMS,
  extractDeepgramTranscript,
} from './deepgram-shared';

import type { STTProvider } from './index';

export class DeepgramNativeCaptureAdapter implements STTProvider {
  readonly name = 'Deepgram';
  private active = false;
  private chunkTimer: ReturnType<typeof setInterval> | null = null;
  private nativeOperation: Promise<void> = Promise.resolve();
  private recording: NativeAudioRecorder | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly onTranscript: (text: string) => void,
    private readonly onError: (error: string) => void,
  ) {}

  async start(): Promise<void> {
    assertDeepgramApiKey(this.apiKey);
    this.active = true;
    await requestNativeRecordingAccess();
    await this.enqueueNative(async () => { await this.startNativeChunks(); });
  }

  async pause(): Promise<void> {
    this.active = false;
    await this.enqueueNative(async () => {
      this.clearNativeTimer();
      await this.stopCurrentRecording();
    });
  }

  async resume(): Promise<void> {
    this.active = true;
    await this.enqueueNative(async () => { await this.startNativeChunks(); });
  }

  async stop(): Promise<void> {
    this.active = false;
    await this.enqueueNative(async () => {
      this.clearNativeTimer();
      await this.stopCurrentRecording();
    });
  }

  private enqueueNative(op: () => Promise<void>): Promise<void> {
    const next = this.nativeOperation.catch(() => undefined).then(op);
    this.nativeOperation = next.catch(() => undefined);
    return next;
  }

  private clearNativeTimer(): void {
    if (this.chunkTimer === null) return;
    clearInterval(this.chunkTimer);
    this.chunkTimer = null;
  }

  private async stopCurrentRecording(): Promise<void> {
    const rec = this.recording;
    this.recording = null;
    if (!rec) return;
    try {
      await rec.stop();
    } catch (e) {
      if (this.active) throw e;
    } finally {
      releaseNativeAudioRecorder(rec);
    }
  }

  private async startNativeChunks(): Promise<void> {
    if (!this.active || this.recording) return;
    this.clearNativeTimer();
    await this.startChunk();
    if (this.active && this.recording) this.chunkTimer = setInterval(() => { void this.rotateChunk(); }, 5000);
  }

  private async startChunk(): Promise<void> {
    const rec = createNativeAudioRecorder();
    try {
      await rec.prepareToRecordAsync();
      rec.record();
      if (!this.active) {
        await rec.stop().catch(() => {});
        releaseNativeAudioRecorder(rec);
        return;
      }
      this.recording = rec;
    } catch (e) {
      await rec.stop().catch(() => {});
      releaseNativeAudioRecorder(rec);
      if (this.active) throw e;
    }
  }

  private async rotateChunk(): Promise<void> {
    await this.enqueueNative(async () => {
      if (!this.active || !this.recording) return;
      const rec = this.recording;
      this.recording = null;
      try {
        let uri: string | null = null;
        try {
          await rec.stop();
          uri = rec.uri;
        } finally {
          releaseNativeAudioRecorder(rec);
        }
        if (uri) {
          this.transcribeChunk(uri).then((text) => {
            if (text && this.active) this.onTranscript(text);
          }).catch((e: unknown) => {
            if (this.active) this.onError(`Transcription failed: ${e instanceof Error ? e.message : String(e)}`);
          });
        }
        if (this.active) await this.startChunk();
      } catch (e) {
        if (this.active) {
          this.onError(`Recording error: ${e instanceof Error ? e.message : String(e)}`);
          this.active = false;
          this.clearNativeTimer();
        }
      }
    });
  }

  private async transcribeChunk(uri: string): Promise<string> {
    try {
      const result = await FileSystem.uploadAsync(`${DEEPGRAM_HTTP_URL}?${DEEPGRAM_PARAMS}`, uri, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'audio/mp4',
        },
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Deepgram HTTP ${result.status}: ${result.body}`);
      }
      return extractDeepgramTranscript(result.body);
    } finally {
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
  }
}
