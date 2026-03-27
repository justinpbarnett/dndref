import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
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

  // Web state
  private ws: WebSocket | null = null;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;

  // Native state
  private chunkTimer: ReturnType<typeof setInterval> | null = null;
  private recording: Audio.Recording | null = null;

  constructor(
    apiKey: string,
    onTranscript: (text: string) => void,
    onError: (error: string) => void,
  ) {
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

  // -- Web: MediaRecorder -> WebSocket streaming --

  private async startWeb(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      throw new Error('Microphone access denied.');
    }

    this.ws = new WebSocket(`${DG_WS}?${DG_PARAMS}`, ['token', this.apiKey]);

    this.ws.onopen = () => {
      if (!this.stream) return;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      this.recorder = new MediaRecorder(this.stream, { mimeType });
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(e.data);
        }
      };
      this.recorder.start(250);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'Results' && data.is_final) {
          const text: string = data.channel?.alternatives?.[0]?.transcript ?? '';
          if (text.trim()) this.onTranscript(text.trim());
        }
      } catch (e) {
        this.onError(`Unexpected Deepgram response: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    this.ws.onerror = () => this.onError('Deepgram connection error. Check your API key and network.');

    this.ws.onclose = (event) => {
      if (this.active) {
        const msg = event.code === 1008
          ? 'Deepgram rejected the connection -- verify your API key.'
          : `Deepgram connection closed (${event.code}). Check your network.`;
        this.onError(msg);
        if (this.recorder?.state !== 'inactive') this.recorder?.stop();
        this.active = false;
      }
    };
  }

  // -- Native: expo-av chunked recording -> REST prerecorded --

  private async startNative(): Promise<void> {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission denied.');
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    await this.startNativeChunks();
  }

  private async startNativeChunks(): Promise<void> {
    await this.startChunk();
    this.chunkTimer = setInterval(() => { void this.rotateChunk(); }, 5000);
  }

  private async startChunk(): Promise<void> {
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    this.recording = rec;
  }

  private async rotateChunk(): Promise<void> {
    if (!this.active || !this.recording) return;
    const rec = this.recording;
    this.recording = null;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (uri) {
        this.transcribeChunk(uri).then((text) => {
          if (text && this.active) this.onTranscript(text);
        }).catch((e: unknown) => {
          this.onError(`Transcription failed: ${e instanceof Error ? e.message : String(e)}`);
        });
      }
      if (this.active) await this.startChunk();
    } catch (e) {
      this.onError(`Recording error: ${e instanceof Error ? e.message : String(e)}`);
      this.active = false;
    }
  }

  private async transcribeChunk(uri: string): Promise<string> {
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
  }

  // -- Controls --

  pause(): void {
    this.active = false;
    if (Platform.OS === 'web') {
      this.recorder?.pause();
    } else {
      if (this.chunkTimer !== null) {
        clearInterval(this.chunkTimer);
        this.chunkTimer = null;
      }
      this.recording?.stopAndUnloadAsync().catch(() => {});
      this.recording = null;
    }
  }

  resume(): void {
    this.active = true;
    if (Platform.OS === 'web') {
      if (this.recorder?.state === 'paused') this.recorder.resume();
    } else {
      void this.startNativeChunks();
    }
  }

  stop(): void {
    this.active = false;
    if (Platform.OS === 'web') {
      if (this.recorder?.state !== 'inactive') this.recorder?.stop();
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.close();
      this.stream?.getTracks().forEach((t) => t.stop());
      this.recorder = null;
      this.ws = null;
      this.stream = null;
    } else {
      if (this.chunkTimer !== null) {
        clearInterval(this.chunkTimer);
        this.chunkTimer = null;
      }
      this.recording?.stopAndUnloadAsync().catch(() => {});
      this.recording = null;
    }
  }
}
