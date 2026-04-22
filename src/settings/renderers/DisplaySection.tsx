import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { CardSize, ColorScheme } from '../../context/ui-settings';
import { CARD_SIZE_DESCS, CARD_SIZE_LABELS, COLOR_SCHEME_LABELS } from '../constants';
import { DisplaySectionProps } from '../types';

export function DisplaySection({ cardSize, setCardSize, colorScheme, setColorScheme, styles }: DisplaySectionProps) {
  const CARD_SIZE_CONFIGS = { S: {}, M: {}, L: {}, XL: {} };

  return (
    <View testID="settings-content" style={styles.contentInner}>
      <View style={styles.group}>
        <Text style={styles.groupLabel}>CARD SIZE</Text>
        <View style={styles.segmentRow}>
          {(Object.keys(CARD_SIZE_CONFIGS) as CardSize[]).map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.segment, cardSize === size && styles.segmentActive]}
              onPress={() => setCardSize(size)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentLabel, cardSize === size && styles.segmentLabelActive]}>
                {CARD_SIZE_LABELS[size]}
              </Text>
              <Text style={[styles.segmentDesc, cardSize === size && styles.segmentDescActive]}>
                {CARD_SIZE_DESCS[size]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldHint}>Maximum landscape / portrait columns.</Text>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>THEME</Text>
        <View style={styles.segmentRow}>
          {(['system', 'dark', 'light'] as ColorScheme[]).map((scheme) => (
            <TouchableOpacity
              key={scheme}
              style={[styles.segment, colorScheme === scheme && styles.segmentActive]}
              onPress={() => setColorScheme(scheme)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentLabel, colorScheme === scheme && styles.segmentLabelActive]}>
                {COLOR_SCHEME_LABELS[scheme]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldHint}>System follows your device setting. Defaults to dark.</Text>
      </View>
    </View>
  );
}
