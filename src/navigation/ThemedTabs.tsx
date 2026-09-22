import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicon } from "../components/Ionicon";
import { useColors } from "../context/ui-settings";
import { F } from "../theme";

const APP_TABS = [
  { name: "index", title: "REFERENCE", icon: "layers-outline", focusedIcon: "layers" },
  { name: "debug", title: "DEBUG", icon: "bug-outline", focusedIcon: "bug", href: __DEV__ ? undefined : null },
  { name: "settings", title: "SETTINGS", icon: "settings-outline", focusedIcon: "settings" },
] as const;

export function ThemedTabs() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: {
          backgroundColor: C.bgSurface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 72 + insets.bottom,
          paddingBottom: 12 + insets.bottom,
          paddingTop: 8,
        },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarIconStyle: { height: 22, marginBottom: 2 },
        tabBarActiveTintColor: C.textPrimary,
        tabBarInactiveTintColor: C.textSecondary,
        tabBarLabelStyle: {
          fontSize: 9,
          lineHeight: 16,
          height: 16,
          overflow: "visible",
          fontWeight: "600",
          letterSpacing: 0.8,
          fontFamily: F.display,
        },
      }}
    >
      {APP_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            href: "href" in tab ? tab.href : undefined,
            tabBarButtonTestID: `tab-${tab.name}`,
            tabBarIcon: ({ color, focused }) => (
              <Ionicon name={focused ? tab.focusedIcon : tab.icon} size={20} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
