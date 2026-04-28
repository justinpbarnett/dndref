import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, type AudioRecorder } from "expo-audio";
import AudioModule from "expo-audio/build/AudioModule";
import { createRecordingOptions } from "expo-audio/build/utils/options";

export type NativeAudioRecorder = AudioRecorder;

export async function requestNativeRecordingAccess(): Promise<void> {
  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) throw new Error("Microphone permission denied.");
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
}

export async function startNativeAudioChunk(isActive: () => boolean): Promise<NativeAudioRecorder | null> {
  const recording = createNativeAudioRecorder();
  try {
    await recording.prepareToRecordAsync();
    recording.record();
    if (isActive()) return recording;
    await recording.stop().catch(() => {});
    releaseNativeAudioRecorder(recording);
    return null;
  } catch (e) {
    await recording.stop().catch(() => {});
    releaseNativeAudioRecorder(recording);
    if (isActive()) throw e;
    return null;
  }
}

export async function stopNativeAudioRecording(recording: NativeAudioRecorder, rethrowErrors: boolean): Promise<void> {
  try {
    await recording.stop();
  } catch (e) {
    if (rethrowErrors) throw e;
  } finally {
    releaseNativeAudioRecorder(recording);
  }
}

export async function stopRecordingForUpload(recording: NativeAudioRecorder): Promise<string | null> {
  try {
    await recording.stop();
    return recording.uri;
  } finally {
    releaseNativeAudioRecorder(recording);
  }
}

const createNativeAudioRecorder = (): NativeAudioRecorder =>
  new AudioModule.AudioRecorder(createRecordingOptions(RecordingPresets.HIGH_QUALITY));

function releaseNativeAudioRecorder(rec: NativeAudioRecorder): void {
  try {
    rec.release();
  } catch {}
}
