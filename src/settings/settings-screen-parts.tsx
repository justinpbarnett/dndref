import React from "react";
import { Text, TouchableOpacity } from "react-native";

import { Ionicon } from "../components/Ionicon";
import type { Colors } from "../theme";
import { type Category, CATEGORIES } from "./constants";
import { AISection } from "./renderers/AISection";
import { DataSection } from "./renderers/DataSection";
import { DisplaySection } from "./renderers/DisplaySection";
import { FilesSection } from "./renderers/FilesSection";
import { VoiceSection } from "./renderers/VoiceSection";
import type { createStyles } from "./styles";
import type { useSettingsScreenController } from "./use-settings-screen-controller";

type SettingsStyles = ReturnType<typeof createStyles>;

type SettingsContentProps = {
  controller: ReturnType<typeof useSettingsScreenController>;
  styles: SettingsStyles;
};

export function SettingsContent({ controller, styles }: SettingsContentProps) {
  switch (controller.category) {
    case "display":
      return <DisplaySection {...controller.display} styles={styles} />;
    case "voice":
      return <VoiceSection {...controller.voice} styles={styles} />;
    case "data":
      return <DataSection {...controller.data} styles={styles} />;
    case "files":
      return <FilesSection {...controller.files} styles={styles} />;
    case "ai":
      return <AISection {...controller.ai} styles={styles} />;
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
