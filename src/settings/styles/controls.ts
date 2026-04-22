import { StyleSheet } from 'react-native';

import { Colors, F } from '../../theme';

export function createControlStyles(C: Colors) {
  return StyleSheet.create({
    segmentRow: {
      flexDirection: 'row',
      gap: 6,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 4,
      backgroundColor: C.bgCard,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: C.border,
      gap: 3,
    },
    segmentActive: {
      borderColor: C.active + '70',
      backgroundColor: C.bgCardPinned,
    },
    segmentLabel: {
      color: C.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      fontFamily: F.mono,
    },
    segmentLabelActive: {
      color: C.active,
    },
    segmentDesc: {
      color: C.textMuted,
      fontSize: 9,
      fontFamily: F.mono,
    },
    segmentDescActive: {
      color: C.active + 'aa',
    },

    optionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      backgroundColor: C.bgCard,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    optionRowActive: {
      borderColor: C.active + '60',
      backgroundColor: C.bgCardPinned,
    },
    radio: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.borderStrong,
      marginTop: 2,
    },
    radioActive: {
      borderColor: C.active,
      backgroundColor: C.active,
    },
    optionBody: { flex: 1, gap: 3 },
    optionTitle: {
      color: C.textPrimary,
      fontSize: 13,
      fontWeight: '600',
      fontFamily: F.display,
    },
    optionDesc: {
      color: C.textSecondary,
      fontSize: 11,
      fontFamily: F.mono,
      letterSpacing: 0.2,
    },

    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: C.bgCard,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    toggleBody: { flex: 1, gap: 3 },

    input: {
      backgroundColor: C.bgInput,
      color: C.textPrimary,
      borderRadius: 3,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 13,
      borderWidth: 1,
      borderColor: C.border,
      fontFamily: F.mono,
    },
    textarea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },

    saveBtn: {
      backgroundColor: C.active,
      borderRadius: 3,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    saveBtnText: {
      color: C.bg,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      fontFamily: F.mono,
    },
    outlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.active + '80',
      borderRadius: 3,
      paddingVertical: 10,
    },
    outlineBtnDisabled: {
      borderColor: C.border,
      opacity: 0.5,
    },
    outlineBtnText: {
      color: C.active,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      fontFamily: F.mono,
    },
  });
}
