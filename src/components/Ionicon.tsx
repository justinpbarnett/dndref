import { Ionicons as ExpoIonicons } from '@expo/vector-icons';
import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import React from 'react';
import {
  Platform, StyleProp, Text, TextProps, TextStyle,
} from 'react-native';

export type IoniconName = keyof typeof glyphMap;

interface IoniconProps extends Omit<TextProps, 'children'> {
  name: IoniconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Ionicon({
  name,
  size = 12,
  color = 'black',
  style,
  ...props
}: IoniconProps) {
  if (Platform.OS !== 'web') {
    return (
      <ExpoIonicons
        name={name as keyof typeof ExpoIonicons.glyphMap}
        size={size}
        color={color}
        style={style}
        {...props}
      />
    );
  }

  const codePoint = glyphMap[name];
  const glyph = typeof codePoint === 'number' ? String.fromCodePoint(codePoint) : '?';

  return (
    <Text
      selectable={false}
      {...props}
      style={[
        {
          color,
          fontFamily: 'ionicons',
          fontSize: size,
          fontStyle: 'normal',
          fontWeight: 'normal',
        },
        style,
      ]}
    >
      {glyph}
    </Text>
  );
}
