import { TextInput, type TextInputProps } from "react-native";

export const SettingsInput = ({ styles, style, ...props }: TextInputProps & { styles: any }) => (
  <TextInput
    style={[styles.input, style]}
    placeholderTextColor={styles.__colors.textMuted}
    autoCorrect={false}
    autoCapitalize="none"
    {...props}
  />
);
