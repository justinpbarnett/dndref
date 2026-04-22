import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { createNativeAudioRecorder, releaseNativeAudioRecorder, requestNativeRecordingAccess, type NativeAudioRecorder } from './native-audio';

import { STTProvider } from './index';

const DG_BASE = 'https://api.deepgram.com/v1/listen';
const DG_WS = 'wss://api.deepgram.com/v1/listen';
const DG_PARAMS = 'model=nova-2&punctuate=true&smart_format=true&language=en-US';

export class DeepgramProvider implements STTProvider {
  readonly name = 'Deepgram';
  private apiKey: string;
  private onTranscript: (text: string) => void;
  private onError: (error: string) => void;
  private active = false;
  private ws: WebSocket | null = null;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;

  private chunkTimer: ReturnType<typeof setInterval> | null = null;
  private recording: NativeAudioRecorder | null = null;
  private nativeOperation: Promise<void> = Promise.resolve();

  constructor(apiKey: string, onTranscript: (text: string) => void, onError: (error: string) => void) {
    this.apiKey = apiKey;
    this.onTranscript = onTranscript;
    this.onError = onError;
  }

  async start(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Deepgram API key not set. Configure it in the Settings tab.');
    }
    this.active = true;
    if (Platform.OS === 'web') {
      await this.startWeb();
    } else {
      await this.startNative();
    }
  }

  private getDeepgramCloseMessage(event: CloseEvent): string {
    if (event.code === 1008) return 'Deepgram rejected the connection -- verify your API key.';
    return `Deepgram connection closed (${event.code}). Check your network.`;
  }

  private getRecorderOptions(): MediaRecorderOptions | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
    return mimeType ? { mimeType } : undefined;
  }

  private cleanupWeb(): void {
    const recorder = this.recorder;
    this.recorder = null;
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    } catch {}
    const ws = this.ws;
    this.ws = null;
    try {
      if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close();
    } catch {}
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  private async startWeb(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is not available in this browser.');
    if (typeof MediaRecorder === 'undefined') throw new Error('Browser audio recording is not available.');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(`Microphone access denied. ${detail}`);
    }
    if (!this.active) { stream.getTracks().forEach((track) => track.stop()); throw new Error('Recording was stopped before microphone access completed.'); }
    this.stream = stream;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${DG_WS}?${DG_PARAMS}`, ['token', this.apiKey]);
      this.ws = ws;
      let settled = false;

      const settle = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (err) {
          this.active = false;
          this.cleanupWeb();
          reject(err);
        } else {
          resolve();
        }
      };

      const timeout = setTimeout(() => {
        settle(new Error('Deepgram connection timed out. Check your API key and network.'));
      }, 10000);

      ws.onopen = () => {
        if (!this.active || !this.stream) {
          settle(new Error('Recording was stopped before Deepgram connected.'));
          return;
        }
        try {
          const recorder = new MediaRecorder(this.stream, this.getRecorderOptions());
          this.recorder = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(e.data);
            }
          };
          recorder.onerror = (event) => {
            const err = event instanceof ErrorEvent ? event.message : 'Unknown recording error';
            if (!settled) { settle(new Error(`Mic recording error: ${err}`)); return; }
            if (this.active) this.onError(`Mic recording error: ${err}`);
          };
          recorder.start(250);
          settle();
        } catch (e) {
          settle(new Error(`Failed to start browser recorder: ${e instanceof Error ? e.message : String(e)}`));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === 'Results' && data.is_final) {
            const text: string = data.channel?.alternatives?.[0]?.transcript ?? '';
            if (text.trim() && this.active) this.onTranscript(text.trim());
          }
        } catch (e) {
          if (this.active) this.onError(`Unexpected Deepgram response: ${e instanceof Error ? e.message : String(e)}`);
        }
      };

      ws.onerror = () => {
        const err = new Error('Deepgram connection error. Check your API key and network.');
        if (!settled) { settle(err); return; }
        if (this.active) this.onError(err.message);
      };

      ws.onclose = (event) => {
        if (!settled) { settle(new Error(this.getDeepgramCloseMessage(event))); return; }
        if (this.active) {
          this.onError(this.getDeepgramCloseMessage(event));
          this.active = false;
          this.cleanupWeb();
        }
      };
    });
  }

  private async startNative(): Promise<void> {
    await requestNativeRecordingAccess();
    await this.enqueueNative(async () => { await this.startNativeChunks(); });
  }

  private enqueueNative(op: () => Promise<void>): Promise<void> {
    const next = this.nativeOperation.catch(() => undefined).then(op);
    this.nativeOperation = next.catch(() => undefined);
    return next;
  }

  private clearNativeTimer(): void {
    if (this.chunkTimer !== null) { clearInterval(this.chunkTimer); this.chunkTimer = null; }
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
      const result = await FileSystem.uploadAsync(`${DG_BASE}?${DG_PARAMS}`, uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'audio/mp4',
        },
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Deepgram HTTP ${result.status}: ${result.body}`);
      }
      const data = JSON.parse(result.body) as {
        results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
      };
      return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
    } finally {
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
  }

  async pause(): Promise<void> {
    this.active = false;
    if (Platform.OS === 'web') {
      if (this.recorder?.state === 'recording') this.recorder.pause();
      return;
    }
    await this.enqueueNative(async () => { this.clearNativeTimer(); await this.stopCurrentRecording(); });
  }

  async resume(): Promise<void> {
    this.active = true;
    if (Platform.OS === 'web') {
      if (this.recorder?.state === 'paused' && this.ws?.readyState === WebSocket.OPEN) {
        this.recorder.resume();
        return;
      }
      this.cleanupWeb();
      await this.startWeb();
      return;
    }
    await this.enqueueNative(async () => { await this.startNativeChunks(); });
  }

  async stop(): Promise<void> {
    this.active = false;
    if (Platform.OS === 'web') {
      this.cleanupWeb();
      return;
    }
    await this.enqueueNative(async () => { this.clearNativeTimer(); await this.stopCurrentRecording(); });
  }
}
