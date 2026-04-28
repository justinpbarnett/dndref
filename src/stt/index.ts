export type STTProvider = {
  readonly name: string;
  start(): Promise<void>;
} & Record<"pause" | "resume" | "stop", () => void | Promise<void>>;

export type STTSettings = { provider: "web-speech" | "deepgram"; deepgramApiKey: string };

export const DEFAULT_STT_SETTINGS: STTSettings = { provider: "web-speech", deepgramApiKey: "" };

export const STT_SETTINGS_KEY = "@dnd-ref/stt-settings";
