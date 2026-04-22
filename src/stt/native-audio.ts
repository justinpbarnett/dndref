import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
} from 'expo-audio';
import AudioModule from 'expo-audio/build/AudioModule';
import { createRecordingOptions } from 'expo-audio/build/utils/options';

const NATIVE_RECORDING_OPTIONS = createRecordingOptions(RecordingPresets.HIGH_QUALITY);

export type NativeAudioRecorder = AudioRecorder;

export async function requestNativeRecordingAccess(): Promise<void> {
  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) {
    throw new Error('Microphone permission denied.');
  }
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
}

export function createNativeAudioRecorder(): NativeAudioRecorder {
  return new AudioModule.AudioRecorder(NATIVE_RECORDING_OPTIONS);
}

export function releaseNativeAudioRecorder(rec: NativeAudioRecorder): void {
  try {
    rec.release();
  } catch {}
}
