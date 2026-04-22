import { StyleSheet } from 'react-native';

import { Colors, F } from '../../theme';

export function createGroupStyles(C: Colors) {
  return StyleSheet.create({
    group: {
      gap: 10,
    },
    groupLabel: {
      color: C.textDim,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 2.5,
      fontFamily: F.mono,
    },
    groupDesc: {
      color: C.textSecondary,
      fontSize: 11,
      fontFamily: F.mono,
      letterSpacing: 0.2,
      marginTop: -4,
    },
    fieldHint: {
      color: C.textSecondary,
      fontSize: 11,
      fontFamily: F.mono,
      letterSpacing: 0.2,
    },
    warning: {
      color: C.paused,
      fontSize: 11,
      fontFamily: F.mono,
    },
  });
}
