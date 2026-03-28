import { StyleSheet } from 'react-native';
import { Colors, F } from '../../../src/theme';

export function createLayoutStyles(C: Colors, isWide: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: isWide ? 'row' : 'column',
      backgroundColor: C.bg,
    },

    sidebar: {
      width: 168,
      backgroundColor: C.bgSurface,
      borderRightWidth: 1,
      borderRightColor: C.border,
      paddingTop: 24,
      paddingBottom: 16,
      paddingHorizontal: 10,
      gap: 2,
    },
    sidebarTitle: {
      color: C.textMuted,
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 3,
      fontFamily: F.mono,
      paddingHorizontal: 8,
      paddingBottom: 14,
    },
    sidebarItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 4,
    },
    sidebarItemActive: {
      backgroundColor: C.bgCard,
    },
    sidebarLabel: {
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: F.mono,
      letterSpacing: 0.3,
    },
    sidebarLabelActive: {
      color: C.textPrimary,
    },

    tabBar: {
      flexGrow: 0,
      backgroundColor: C.bgSurface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    tabBarContent: {
      paddingHorizontal: 8,
    },
    tab: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: C.active,
    },
    tabLabel: {
      color: C.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.5,
      fontFamily: F.mono,
    },
    tabLabelActive: {
      color: C.textPrimary,
    },

    content: {
      flex: 1,
    },
    contentPad: {
      flexGrow: 1,
    },
    contentInner: {
      padding: isWide ? 24 : 16,
      gap: 24,
    },
  });
}
