import type { CardSize, ColorScheme } from "../context/ui-settings";
import type { UploadedFile } from "../entities/providers/file-upload";
import type { DataSourcesSettings } from "../storage/settings";
import type { STTSettings } from "../stt/index";
import type { createStyles } from "./styles";

type StyledSectionProps = { styles: ReturnType<typeof createStyles> };

export interface DisplaySectionProps extends StyledSectionProps {
  cardSize: CardSize;
  setCardSize: (size: CardSize) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

export interface VoiceSectionProps extends StyledSectionProps {
  sttSettings: STTSettings;
  setSttSettings: React.Dispatch<React.SetStateAction<STTSettings>>;
  saveVoice: () => Promise<void>;
  voiceSaved: boolean;
  isWebSpeech: boolean;
}

export interface DataSectionProps extends StyledSectionProps {
  dsLocal: DataSourcesSettings;
  setDsLocal: React.Dispatch<React.SetStateAction<DataSourcesSettings>>;
  saveData: () => Promise<void>;
  dataSaved: boolean;
}

export type FilesSectionProps = StyledSectionProps &
  Record<"pasteFileName" | "pasteContent" | "deleteAllStatus", string> & {
    uploads: UploadedFile[];
    removingUploadId: string | null;
    setPasteFileName: React.Dispatch<React.SetStateAction<string>>;
    setPasteContent: React.Dispatch<React.SetStateAction<string>>;
    handleDeleteUpload: (id: string) => Promise<void>;
    pickFilesWeb: () => void;
    deleteAllPending: boolean;
  } & Record<"handlePasteAdd" | "handleDeleteAllData", () => Promise<void>>;

export type AISectionProps = StyledSectionProps &
  Record<"aiContent" | "aiResult", string> & {
    dsLocal: DataSourcesSettings;
    setDsLocal: React.Dispatch<React.SetStateAction<DataSourcesSettings>>;
    setAiContent: React.Dispatch<React.SetStateAction<string>>;
    aiParsing: boolean;
    handleAIParse: () => Promise<void>;
  };
