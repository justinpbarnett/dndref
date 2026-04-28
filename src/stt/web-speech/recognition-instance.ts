import { getErrorMessage } from "./recognition-errors";
import { installRecognitionHandlers, type RecognitionHandlers } from "./recognition-events";
import type { AnyRecognition, RecognitionConstructor } from "./recognition-types";

const WEB_SPEECH_UNAVAILABLE_MESSAGE =
  "Web Speech API not available. Firefox: enable media.webspeech.recognition.enable in about:config. Or go to Settings and configure a Deepgram API key.";

export function createStartedRecognition(handlers: RecognitionHandlers): AnyRecognition {
  const SR: RecognitionConstructor | undefined = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  if (!SR) throw new Error(WEB_SPEECH_UNAVAILABLE_MESSAGE);

  const recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  installRecognitionHandlers(recognition, handlers);

  try {
    recognition.start();
    return recognition;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
