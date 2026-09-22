import { TextInput, type StyleProp, type TextInputProps, type TextStyle } from "react-native";

import { useColors } from "../../context/ui-settings";

type SettingsInputProps = TextInputProps & { styles: { input: StyleProp<TextStyle> } };

export const SettingsInput = ({ styles, style, ...props }: SettingsInputProps) => {
  const C = useColors();

  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={C.textMuted}
      autoCorrect={false}
      autoCapitalize="none"
      {...props}
    />
  );
};
