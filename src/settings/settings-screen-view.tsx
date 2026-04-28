import React from "react";
import { ScrollView, Text, View } from "react-native";

import type { Colors } from "../theme";
import { CATEGORIES } from "./constants";
import { SettingsCategoryButton, SettingsContent } from "./settings-screen-parts";
import type { createStyles } from "./styles";
import type { useSettingsScreenController } from "./use-settings-screen-controller";

type SettingsScreenController = ReturnType<typeof useSettingsScreenController>;
type SettingsStyles = ReturnType<typeof createStyles>;

type SettingsScreenViewProps = {
  colors: Colors;
  controller: SettingsScreenController;
  isWide: boolean;
  styles: SettingsStyles;
};

export function SettingsScreenView({ colors, controller, isWide, styles }: SettingsScreenViewProps) {
  const {
    category,
    setCategory,
    dataSaved,
    uiSettings: { cardSize, setCardSize, colorScheme, setColorScheme },
    voiceCategory,
    dsLocal,
    setDsLocal,
    filesCategory,
    aiContent,
    setAiContent,
    aiParsing,
    aiResult,
    saveData,
    handleAIParse,
  } = controller;

  return (
    <View style={styles.root}>
      {isWide ? (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>SETTINGS</Text>
          {CATEGORIES.map((cat) => (
            <SettingsCategoryButton
              key={cat.id}
              cat={cat}
              activeCategory={category}
              colors={colors}
              styles={styles}
              onSelect={setCategory}
            />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {CATEGORIES.map((cat) => (
            <SettingsCategoryButton
              key={cat.id}
              cat={cat}
              activeCategory={category}
              mobile
              colors={colors}
              styles={styles}
              onSelect={setCategory}
            />
          ))}
        </ScrollView>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPad} showsVerticalScrollIndicator={false}>
        <SettingsContent
          category={category}
          cardSize={cardSize}
          setCardSize={setCardSize}
          colorScheme={colorScheme}
          setColorScheme={setColorScheme}
          dsLocal={dsLocal}
          setDsLocal={setDsLocal}
          saveData={saveData}
          dataSaved={dataSaved}
          filesCategory={filesCategory}
          voiceCategory={voiceCategory}
          aiContent={aiContent}
          setAiContent={setAiContent}
          aiParsing={aiParsing}
          aiResult={aiResult}
          handleAIParse={handleAIParse}
          styles={styles}
        />
      </ScrollView>
    </View>
  );
}
