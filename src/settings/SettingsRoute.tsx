import React, { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { useColors } from "../context/ui-settings";
import { SettingsScreenView } from "./settings-screen-view";
import { createStyles } from "./styles";
import { useSettingsScreenController } from "./use-settings-screen-controller";

export default function SettingsScreen() {
  const C = useColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const styles = useMemo(() => createStyles(C, isWide), [C, isWide]);
  const controller = useSettingsScreenController();

  return <SettingsScreenView colors={C} controller={controller} isWide={isWide} styles={styles} />;
}
