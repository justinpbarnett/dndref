import { getErrorMessage } from "../../utils/error-message";

export async function openMicrophoneStream(active: () => boolean): Promise<MediaStream> {
  const mediaDevices = globalThis.navigator?.mediaDevices;
  if (!mediaDevices?.getUserMedia) throw new Error("Microphone capture is not available in this browser.");
  if (typeof MediaRecorder === "undefined") throw new Error("Browser audio recording is not available.");

  let stream: MediaStream;
  try {
    stream = await mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    throw new Error(`Microphone access denied. ${getErrorMessage(e)}`);
  }

  if (!active()) {
    stopMediaStream(stream);
    throw new Error("Recording was stopped before microphone access completed.");
  }
  return stream;
}

export const stopMediaStream = (stream: MediaStream): void => stream.getTracks().forEach((track) => track.stop());
