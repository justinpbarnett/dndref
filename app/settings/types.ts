import { UploadedFile } from '../../src/entities/providers/file-upload';
import { DataSourcesSettings } from '../../src/context/data-sources';
import { STTSettings } from '../../src/stt/index';

export interface DisplaySectionProps {
  cardSize: import('../../src/context/ui-settings').CardSize;
  setCardSize: (size: import('../../src/context/ui-settings').CardSize) => void;
  colorScheme: import('../../src/context/ui-settings').ColorScheme;
  setColorScheme: (scheme: import('../../src/context/ui-settings').ColorScheme) => void;
  styles: any;
}

export interface VoiceSectionProps {
  sttSettings: STTSettings;
  setSttSettings: React.Dispatch<React.SetStateAction<STTSettings>>;
  saveVoice: () => Promise<void>;
  voiceSaved: boolean;
  isWebSpeech: boolean;
  styles: any;
}

export interface DataSectionProps {
  dsLocal: DataSourcesSettings;
  setDsLocal: React.Dispatch<React.SetStateAction<DataSourcesSettings>>;
  saveData: () => Promise<void>;
  dataSaved: boolean;
  styles: any;
}

export interface FilesSectionProps {
  uploads: UploadedFile[];
  refreshUploads: () => Promise<void>;
  pasteFileName: string;
  setPasteFileName: React.Dispatch<React.SetStateAction<string>>;
  pasteContent: string;
  setPasteContent: React.Dispatch<React.SetStateAction<string>>;
  pickFilesWeb: () => void;
  handlePasteAdd: () => Promise<void>;
  handleDeleteUpload: (id: string) => Promise<void>;
  styles: any;
}

export interface AISectionProps {
  dsLocal: DataSourcesSettings;
  setDsLocal: React.Dispatch<React.SetStateAction<DataSourcesSettings>>;
  aiContent: string;
  setAiContent: React.Dispatch<React.SetStateAction<string>>;
  aiParsing: boolean;
  aiResult: string;
  handleAIParse: () => Promise<void>;
  styles: any;
}
