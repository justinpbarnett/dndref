// Web Speech API types are vendor-prefixed and not always in lib.dom.d.ts.
export type AnyRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};

export type RecognitionConstructor = new () => AnyRecognition;
