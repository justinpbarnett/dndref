import {
  assertDeepgramApiKey,
  DEEPGRAM_PARAMS,
  DEEPGRAM_WS_URL,
  extractDeepgramFinalTranscript,
  getDeepgramCloseMessage,
} from './deepgram-shared';

import type { STTProvider } from './index';

const BROWSER_RECORDER_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
const DEEPGRAM_CONNECTION_TIMEOUT_MS = 10000;
const RECORDER_TIMESLICE_MS = 250;

export class DeepgramBrowserCaptureAdapter implements STTProvider {
  readonly name = 'Deepgram';
  private active = false;
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private ws: WebSocket | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly onTranscript: (text: string) => void,
    private readonly onError: (error: string) => void,
  ) {}

  async start(): Promise<void> {
    assertDeepgramApiKey(this.apiKey);
    this.active = true;
    await this.startBrowserCapture();
  }

  pause(): void {
    this.active = false;
    if (this.recorder?.state === 'recording') this.recorder.pause();
  }

  async resume(): Promise<void> {
    this.active = true;
    if (this.recorder?.state === 'paused' && this.ws?.readyState === WebSocket.OPEN) {
      this.recorder.resume();
      return;
    }
    this.cleanup();
    await this.startBrowserCapture();
  }

  stop(): void {
    this.active = false;
    this.cleanup();
  }

  private getRecorderOptions(): MediaRecorderOptions | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    const mimeType = BROWSER_RECORDER_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    return mimeType ? { mimeType } : undefined;
  }

  private cleanup(): void {
    this.stopRecorder();
    this.closeSocket();
    if (this.stream) stopMediaStream(this.stream);
    this.stream = null;
  }

  private stopRecorder(): void {
    const recorder = this.recorder;
    this.recorder = null;
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    } catch {}
  }

  private closeSocket(): void {
    const ws = this.ws;
    this.ws = null;
    try {
      if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close();
    } catch {}
  }

  private async startBrowserCapture(): Promise<void> {
    this.stream = await this.openMicrophoneStream();
    await this.connectDeepgramSocket();
  }

  private async openMicrophoneStream(): Promise<MediaStream> {
    const mediaDevices = globalThis.navigator?.mediaDevices;
    if (!mediaDevices?.getUserMedia) throw new Error('Microphone capture is not available in this browser.');
    if (typeof MediaRecorder === 'undefined') throw new Error('Browser audio recording is not available.');

    let stream: MediaStream;
    try {
      stream = await mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(`Microphone access denied. ${detail}`);
    }

    if (!this.active) {
      stopMediaStream(stream);
      throw new Error('Recording was stopped before microphone access completed.');
    }
    return stream;
  }

  private connectDeepgramSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${DEEPGRAM_WS_URL}?${DEEPGRAM_PARAMS}`, ['token', this.apiKey]);
      this.ws = ws;
      let settled = false;

      const settle = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (err) {
          this.active = false;
          this.cleanup();
          reject(err);
        } else {
          resolve();
        }
      };

      const timeout = setTimeout(() => {
        settle(new Error('Deepgram connection timed out. Check your API key and network.'));
      }, DEEPGRAM_CONNECTION_TIMEOUT_MS);

      ws.onopen = () => {
        if (!this.active || !this.stream) {
          settle(new Error('Recording was stopped before Deepgram connected.'));
          return;
        }
        try {
          const recorder = new MediaRecorder(this.stream, this.getRecorderOptions());
          this.recorder = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) this.ws.send(e.data);
          };
          recorder.onerror = (event) => {
            const err = event instanceof ErrorEvent ? event.message : 'Unknown recording error';
            if (!settled) {
              settle(new Error(`Mic recording error: ${err}`));
              return;
            }
            if (this.active) this.onError(`Mic recording error: ${err}`);
          };
          recorder.start(RECORDER_TIMESLICE_MS);
          settle();
        } catch (e) {
          settle(new Error(`Failed to start browser recorder: ${e instanceof Error ? e.message : String(e)}`));
        }
      };

      ws.onmessage = (event) => {
        this.handleDeepgramMessage(event.data as string);
      };

      ws.onerror = () => {
        const err = new Error('Deepgram connection error. Check your API key and network.');
        if (!settled) {
          settle(err);
          return;
        }
        if (this.active) this.onError(err.message);
      };

      ws.onclose = (event) => {
        const message = getDeepgramCloseMessage(event);
        if (!settled) {
          settle(new Error(message));
          return;
        }
        if (this.active) {
          this.onError(message);
          this.active = false;
          this.cleanup();
        }
      };
    });
  }

  private handleDeepgramMessage(message: string): void {
    try {
      const text = extractDeepgramFinalTranscript(message).trim();
      if (text && this.active) this.onTranscript(text);
    } catch (e) {
      if (this.active) this.onError(`Unexpected Deepgram response: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

function stopMediaStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}
