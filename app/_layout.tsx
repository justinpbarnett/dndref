import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { UISettingsProvider, useColors } from '../src/context/ui-settings';
import { DataSourcesProvider } from '../src/context/data-sources';
import { SessionProvider } from '../src/context/session';
import { F } from '../src/theme';

function ThemedTabs() {
  const C = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: {
          backgroundColor: C.bgSurface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 56,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: C.textPrimary,
        tabBarInactiveTintColor: C.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 1,
          fontFamily: F.display,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'REFERENCE',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'layers' : 'layers-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="debug"
        options={{
          title: 'DEBUG',
          href: __DEV__ ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bug' : 'bug-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Courier+Prime:wght@400;700&display=swap';
    document.head.appendChild(link);
  }, []);

  return (
    <UISettingsProvider>
      <DataSourcesProvider>
        <SessionProvider>
          <ThemedTabs />
        </SessionProvider>
      </DataSourcesProvider>
    </UISettingsProvider>
  );
}
