import { DataSourcesSettings } from "../context/data-sources";
import { UploadedFile } from "../entities/providers/file-upload";
import { STTSettings } from "../stt/index";

interface StyledSectionProps {
  styles: any;
}

export interface DisplaySectionProps extends StyledSectionProps {
  cardSize: import("../context/ui-settings").CardSize;
  setCardSize: (size: import("../context/ui-settings").CardSize) => void;
  colorScheme: import("../context/ui-settings").ColorScheme;
  setColorScheme: (scheme: import("../context/ui-settings").ColorScheme) => void;
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

export interface FilesSectionProps extends StyledSectionProps {
  uploads: UploadedFile[];
  removingUploadId: string | null;
  pasteFileName: string;
  setPasteFileName: React.Dispatch<React.SetStateAction<string>>;
  pasteContent: string;
  setPasteContent: React.Dispatch<React.SetStateAction<string>>;
  pickFilesWeb: () => void;
  handlePasteAdd: () => Promise<void>;
  handleDeleteUpload: (id: string) => Promise<void>;
  handleDeleteAllData: () => Promise<void>;
  deleteAllPending: boolean;
  deleteAllStatus: string;
}

export interface AISectionProps extends StyledSectionProps {
  dsLocal: DataSourcesSettings;
  setDsLocal: React.Dispatch<React.SetStateAction<DataSourcesSettings>>;
  aiContent: string;
  setAiContent: React.Dispatch<React.SetStateAction<string>>;
  aiParsing: boolean;
  aiResult: string;
  handleAIParse: () => Promise<void>;
}
