import { StyleSheet } from 'react-native';

import { Colors, F } from '../../theme';

export function createFileStyles(C: Colors) {
  return StyleSheet.create({
    fileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: C.bgCard,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: C.border,
    },
    fileName: {
      flex: 1,
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: F.mono,
    },
    fileRemoveBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 3,
      borderWidth: 1,
      borderColor: C.error + '70',
    },
    fileRemoveBtnDisabled: {
      opacity: 0.45,
    },
  });
}
