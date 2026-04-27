import * as FileSystem from 'expo-file-system/legacy';

import {
  assertDeepgramApiKey,
  DEEPGRAM_HTTP_URL,
  DEEPGRAM_PARAMS,
  extractDeepgramTranscript,
} from './deepgram-shared';
import {
  createNativeAudioRecorder,
  releaseNativeAudioRecorder,
  requestNativeRecordingAccess,
  type NativeAudioRecorder,
} from './native-audio';

import type { STTProvider } from './index';

const NATIVE_AUDIO_CONTENT_TYPE = 'audio/mp4';
const NATIVE_CHUNK_INTERVAL_MS = 5000;

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
    await this.startNativeCapture();
  }

  async pause(): Promise<void> {
    this.active = false;
    await this.stopNativeCapture();
  }

  async resume(): Promise<void> {
    this.active = true;
    await this.startNativeCapture();
  }

  async stop(): Promise<void> {
    this.active = false;
    await this.stopNativeCapture();
  }

  private startNativeCapture(): Promise<void> {
    return this.enqueueNative(async () => { await this.startNativeChunks(); });
  }

  private stopNativeCapture(): Promise<void> {
    return this.enqueueNative(async () => {
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
    const recording = this.recording;
    this.recording = null;
    if (!recording) return;
    try {
      await recording.stop();
    } catch (e) {
      if (this.active) throw e;
    } finally {
      releaseNativeAudioRecorder(recording);
    }
  }

  private async startNativeChunks(): Promise<void> {
    if (!this.active || this.recording) return;
    this.clearNativeTimer();
    await this.startChunk();
    if (this.active && this.recording) {
      this.chunkTimer = setInterval(() => { void this.rotateChunk(); }, NATIVE_CHUNK_INTERVAL_MS);
    }
  }

  private async startChunk(): Promise<void> {
    const recording = createNativeAudioRecorder();
    try {
      await recording.prepareToRecordAsync();
      recording.record();
      if (!this.active) {
        await recording.stop().catch(() => {});
        releaseNativeAudioRecorder(recording);
        return;
      }
      this.recording = recording;
    } catch (e) {
      await recording.stop().catch(() => {});
      releaseNativeAudioRecorder(recording);
      if (this.active) throw e;
    }
  }

  private async rotateChunk(): Promise<void> {
    await this.enqueueNative(async () => {
      if (!this.active || !this.recording) return;
      const recording = this.recording;
      this.recording = null;
      try {
        const uri = await this.stopRecordingForUpload(recording);
        if (uri) this.transcribeCompletedChunk(uri);
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

  private async stopRecordingForUpload(recording: NativeAudioRecorder): Promise<string | null> {
    try {
      await recording.stop();
      return recording.uri;
    } finally {
      releaseNativeAudioRecorder(recording);
    }
  }

  private transcribeCompletedChunk(uri: string): void {
    void this.transcribeChunk(uri).then((text) => {
      if (text && this.active) this.onTranscript(text);
    }).catch((e: unknown) => {
      if (this.active) this.onError(`Transcription failed: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  private async transcribeChunk(uri: string): Promise<string> {
    try {
      const result = await FileSystem.uploadAsync(`${DEEPGRAM_HTTP_URL}?${DEEPGRAM_PARAMS}`, uri, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': NATIVE_AUDIO_CONTENT_TYPE,
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
