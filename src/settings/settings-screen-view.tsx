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
  const { category, setCategory } = controller;

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal={!isWide}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={isWide ? styles.sidebar : styles.tabBar}
        contentContainerStyle={isWide ? styles.sidebarContent : styles.tabBarContent}
      >
        {isWide ? <Text style={styles.sidebarTitle}>SETTINGS</Text> : null}
        {CATEGORIES.map((cat) => (
          <SettingsCategoryButton
            key={cat.id}
            cat={cat}
            activeCategory={category}
            mobile={!isWide}
            colors={colors}
            styles={styles}
            onSelect={setCategory}
          />
        ))}
      </ScrollView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPad} showsVerticalScrollIndicator={false}>
        <SettingsContent controller={controller} styles={styles} />
      </ScrollView>
    </View>
  );
}
