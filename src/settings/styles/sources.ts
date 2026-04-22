import { StyleSheet } from 'react-native';

import { Colors, F } from '../../theme';

export function createSourceStyles(C: Colors) {
  return StyleSheet.create({
    sourcesList: {
      gap: 6,
    },
    publisherGroup: {
      gap: 3,
    },
    sourcesLabel: {
      color: C.textDim,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 2,
      fontFamily: F.mono,
      marginTop: 4,
    },
    publisherLabel: {
      color: C.textMuted,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1,
      fontFamily: F.mono,
      marginTop: 2,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: C.bgCard,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: C.border,
    },
    checkRowActive: {
      borderColor: C.active + '50',
    },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: C.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: C.active,
      borderColor: C.active,
    },
    checkRowLabel: {
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: F.mono,
    },
    checkRowLabelChecked: {
      color: C.textPrimary,
    },
  });
}
