import type { STTProvider } from './index';

import {
  assertDeepgramApiKey,
  DEEPGRAM_PARAMS,
  DEEPGRAM_WS_URL,
  getDeepgramCloseMessage,
} from './deepgram-shared';

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
    const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
    return mimeType ? { mimeType } : undefined;
  }

  private cleanup(): void {
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

  private async startBrowserCapture(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is not available in this browser.');
    if (typeof MediaRecorder === 'undefined') throw new Error('Browser audio recording is not available.');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(`Microphone access denied. ${detail}`);
    }

    if (!this.active) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error('Recording was stopped before microphone access completed.');
    }
    this.stream = stream;

    await new Promise<void>((resolve, reject) => {
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
        if (!settled) {
          settle(err);
          return;
        }
        if (this.active) this.onError(err.message);
      };

      ws.onclose = (event) => {
        if (!settled) {
          settle(new Error(getDeepgramCloseMessage(event)));
          return;
        }
        if (this.active) {
          this.onError(getDeepgramCloseMessage(event));
          this.active = false;
          this.cleanup();
        }
      };
    });
  }
}
