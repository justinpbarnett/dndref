import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicon } from './Ionicon';
import type { CardState } from '../context/session-types';
import { useColors } from '../context/ui-settings';
import { Colors, F, typeAccent } from '../theme';

interface Props {
  card: CardState | null;
  visible: boolean;
  onClose: () => void;
}

export function EntityDetailsModal({ card, visible, onClose }: Props) {
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

  if (!card) return null;

  const accentColor = typeAccent(card.entity.type, C);
  const details = card.entity.details || card.entity.summary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[styles.dialog, { borderColor: accentColor + '55' }]}
          role="dialog"
          accessibilityLabel={`${card.entity.name} details`}
        >
          <View style={[styles.topStrip, { backgroundColor: accentColor }]} />
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <Text style={styles.name}>{card.entity.name}</Text>
              <Text style={[styles.typeLabel, { color: accentColor + 'cc' }]}>{card.entity.type.toUpperCase()}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              role="button"
              accessibilityLabel="Close details"
              style={styles.closeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicon name="close" size={20} color={C.textDim} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.details}>{details}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(C: Colors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: '#00000099',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
    },
    dialog: {
      width: '100%',
      maxWidth: 720,
      maxHeight: '86%',
      backgroundColor: C.bgCard,
      borderRadius: 10,
      borderWidth: 1,
      overflow: 'hidden',
    },
    topStrip: {
      height: 4,
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      padding: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    titleGroup: {
      flex: 1,
      gap: 6,
    },
    name: {
      color: C.textPrimary,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600',
      fontFamily: F.display,
      letterSpacing: 0.6,
    },
    typeLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 2.2,
      fontFamily: F.mono,
    },
    closeButton: {
      paddingTop: 2,
    },
    body: {
      maxHeight: 520,
    },
    bodyContent: {
      padding: 18,
      paddingTop: 14,
    },
    details: {
      color: C.textSecondary,
      fontSize: 15,
      lineHeight: 23,
      fontFamily: F.body,
    },
  });
}
