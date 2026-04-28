import type { Entity } from "../entities";
import type { STTProvider, STTSettings } from "../stt";
import type { CardState, SessionStatus, SttStatus } from "./session-types";

export interface SessionRuntimeDetector {
  detect(transcript: string): Entity[];
}
export interface SessionRuntimeSnapshot {
  status: SessionStatus;
  sttStatus: SttStatus;
  sttError: string | null;
  sttProviderName: string;
  cards: CardState[];
  transcript: string;
  recentDetections: Entity[];
}
export type SttSettingsLoader = () => Promise<STTSettings>;
export type SttProviderBuilder = (
  settings: STTSettings,
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
) => STTProvider;
export interface SessionRuntimeOptions {
  loadSttSettings?: SttSettingsLoader;
  buildSttProvider?: SttProviderBuilder;
  detectIntervalMs?: number;
}
export type DetectionInterval = ReturnType<typeof setInterval>;
export type SnapshotPatch = Partial<SessionRuntimeSnapshot>;
export const INITIAL_SESSION_RUNTIME_SNAPSHOT: SessionRuntimeSnapshot = {
  status: "idle",
  sttStatus: "idle",
  sttError: null,
  sttProviderName: "",
  cards: [],
  transcript: "",
  recentDetections: [],
};
