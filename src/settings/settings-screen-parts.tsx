import React, { type Dispatch, type SetStateAction } from "react";
import { Text, TouchableOpacity } from "react-native";

import { Ionicon } from "../components/Ionicon";
import type { DataSourcesSettings } from "../storage/app-data/data-source-settings-model";
import type { CardSize, ColorScheme } from "../context/ui-settings";
import type { Colors } from "../theme";
import { type Category, CATEGORIES } from "./constants";
import type { useFilesSettingsCategory } from "./files-settings-category";
import { AISection } from "./renderers/AISection";
import { DataSection } from "./renderers/DataSection";
import { DisplaySection } from "./renderers/DisplaySection";
import { FilesSection } from "./renderers/FilesSection";
import { VoiceSection } from "./renderers/VoiceSection";
import type { createStyles } from "./styles";
import type { useVoiceSettingsCategory } from "./voice-settings-category";

type SettingsStyles = ReturnType<typeof createStyles>;
type FilesCategory = ReturnType<typeof useFilesSettingsCategory>;
type VoiceCategory = ReturnType<typeof useVoiceSettingsCategory>;

type SettingsContentProps = {
  category: Category;
  cardSize: CardSize;
  setCardSize: (value: CardSize) => void;
  colorScheme: ColorScheme;
  setColorScheme: (value: ColorScheme) => void;
  dsLocal: DataSourcesSettings;
  setDsLocal: Dispatch<SetStateAction<DataSourcesSettings>>;
  saveData: () => Promise<void>;
  dataSaved: boolean;
  filesCategory: FilesCategory;
  voiceCategory: VoiceCategory;
  aiContent: string;
  setAiContent: Dispatch<SetStateAction<string>>;
  aiParsing: boolean;
  aiResult: string;
  handleAIParse: () => Promise<void>;
  styles: SettingsStyles;
};

export function SettingsContent({
  category,
  cardSize,
  setCardSize,
  colorScheme,
  setColorScheme,
  dsLocal,
  setDsLocal,
  saveData,
  dataSaved,
  filesCategory,
  voiceCategory,
  aiContent,
  setAiContent,
  aiParsing,
  aiResult,
  handleAIParse,
  styles,
}: SettingsContentProps) {
  switch (category) {
    case "display":
      return (
        <DisplaySection
          cardSize={cardSize}
          setCardSize={setCardSize}
          colorScheme={colorScheme}
          setColorScheme={setColorScheme}
          styles={styles}
        />
      );
    case "voice":
      return <VoiceSection {...voiceCategory} styles={styles} />;
    case "data":
      return (
        <DataSection
          dsLocal={dsLocal}
          setDsLocal={setDsLocal}
          saveData={saveData}
          dataSaved={dataSaved}
          styles={styles}
        />
      );
    case "files":
      return <FilesSection {...filesCategory} styles={styles} />;
    case "ai":
      return (
        <AISection
          dsLocal={dsLocal}
          setDsLocal={setDsLocal}
          aiContent={aiContent}
          setAiContent={setAiContent}
          aiParsing={aiParsing}
          aiResult={aiResult}
          handleAIParse={handleAIParse}
          styles={styles}
        />
      );
  }
}

type SettingsCategoryButtonProps = {
  cat: (typeof CATEGORIES)[number];
  activeCategory: Category;
  mobile?: boolean;
  colors: Colors;
  styles: SettingsStyles;
  onSelect: (category: Category) => void;
};

export function SettingsCategoryButton({
  cat,
  activeCategory,
  mobile = false,
  colors,
  styles,
  onSelect,
}: SettingsCategoryButtonProps) {
  const active = activeCategory === cat.id;
  return (
    <TouchableOpacity
      key={cat.id}
      style={[mobile ? styles.tab : styles.sidebarItem, active && (mobile ? styles.tabActive : styles.sidebarItemActive)]}
      onPress={() => onSelect(cat.id)}
      activeOpacity={0.7}
    >
      <Ionicon
        name={active ? cat.iconFocused : cat.icon}
        size={16}
        color={active ? colors.textPrimary : colors.textSecondary}
      />
      <Text
        style={[
          mobile ? styles.tabLabel : styles.sidebarLabel,
          active && (mobile ? styles.tabLabelActive : styles.sidebarLabelActive),
        ]}
      >
        {mobile ? cat.label.toUpperCase() : cat.label}
      </Text>
    </TouchableOpacity>
  );
}
