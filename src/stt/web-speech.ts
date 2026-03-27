import { STTProvider } from './index';

// Web Speech API types are vendor-prefixed and not always in lib.dom.d.ts
type AnyRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};

export class WebSpeechProvider implements STTProvider {
  readonly name = 'Web Speech';
  private recognition: AnyRecognition | null = null;
  private active = false;
  private onTranscript: (text: string) => void;
  private onError: (error: string) => void;

  constructor(onTranscript: (text: string) => void, onError: (error: string) => void) {
    this.onTranscript = onTranscript;
    this.onError = onError;
  }

  async start(): Promise<void> {
    const SR: (new () => AnyRecognition) | undefined =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    if (!SR) {
      throw new Error('Web Speech API not available. Firefox: enable media.webspeech.recognition.enable in about:config. Or go to Settings and configure a Deepgram API key.');
    }

    this.active = true;
    this.recognition = new SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      const results: SpeechRecognitionResultList = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        if (results[i].isFinal) {
          const text = results[i][0].transcript.trim();
          if (text) this.onTranscript(text);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.onError(`Mic error: ${event.error as string}`);
      }
    };

    // Chrome stops recognition after silence -- restart automatically
    this.recognition.onend = () => {
      if (!this.active) return;
      try {
        this.recognition?.start();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('already started')) return;
        this.active = false;
        if (msg.includes('not-allowed') || msg.includes('NotAllowed')) {
          this.onError('Mic permission was revoked. Allow microphone access and restart.');
        } else {
          this.onError(`Failed to restart mic: ${msg}`);
        }
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      this.onError(`Failed to start mic: ${e}`);
    }
  }

  pause(): void {
    this.active = false;
    try { this.recognition?.abort(); } catch {}
  }

  resume(): void {
    this.active = true;
    try {
      this.recognition?.start();
    } catch (e) {
      this.active = false;
      this.onError(`Failed to resume mic: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  stop(): void {
    this.active = false;
    try { this.recognition?.abort(); } catch {}
    this.recognition = null;
  }
}
