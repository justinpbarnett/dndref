import type { AnyRecognition } from "./recognition-types";

export type RecognitionHandlers = {
  onEnd: () => void;
  onError: (error: string) => void;
  onFatalError: () => void;
  onFinalTranscript: (text: string) => void;
  onResult: () => void;
};

export function installRecognitionHandlers(recognition: AnyRecognition, handlers: RecognitionHandlers): void {
  recognition.onresult = (event: any) => {
    handlers.onResult();
    const results: SpeechRecognitionResultList = event.results;
    for (let i = event.resultIndex; i < results.length; i++) {
      if (results[i].isFinal) {
        const text = results[i][0].transcript.trim();
        if (text) handlers.onFinalTranscript(text);
      }
    }
  };

  recognition.onerror = (event: any) => {
    const err: string = event.error;
    if (err === "no-speech" || err === "aborted") return;
    if (isFatalRecognitionError(err)) handlers.onFatalError();
    handlers.onError(`Mic error: ${err}`);
  };

  recognition.onend = handlers.onEnd;
}

const isFatalRecognitionError = (error: string): boolean =>
  error === "not-allowed" || error === "service-not-allowed" || error === "audio-capture";
