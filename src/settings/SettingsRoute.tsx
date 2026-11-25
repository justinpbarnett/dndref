import React, { useMemo, useSyncExternalStore } from "react";
import { Dimensions } from "react-native";

import { useColors } from "../context/ui-settings";
import { SettingsScreenView } from "./settings-screen-view";
import { createStyles } from "./styles";
import { useSettingsScreenController } from "./use-settings-screen-controller";

function subscribeToDimensions(onChange: () => void) {
  const subscription = Dimensions.addEventListener("change", onChange);
  return () => subscription.remove();
}

const getIsWide = () => Dimensions.get("window").width >= 640;
// The static export has no viewport. Match it during hydration before reading the browser width.
const getServerIsWide = () => false;

export default function SettingsScreen() {
  const C = useColors();
  const isWide = useSyncExternalStore(subscribeToDimensions, getIsWide, getServerIsWide);
  const styles = useMemo(() => createStyles(C, isWide), [C, isWide]);
  const controller = useSettingsScreenController();

  return <SettingsScreenView colors={C} controller={controller} isWide={isWide} styles={styles} />;
}
