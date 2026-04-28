import React from "react";
import { TextInput, type TextInputProps } from "react-native";

export function SettingsInput({ styles, style, ...props }: TextInputProps & { styles: any }) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={styles.__colors.textMuted}
      autoCorrect={false}
      autoCapitalize="none"
      {...props}
    />
  );
}
