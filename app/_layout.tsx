import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { UISettingsProvider } from '../src/context/ui-settings';
import { DataSourcesProvider } from '../src/context/data-sources';
import { SessionProvider } from '../src/context/session';
import { C, F } from '../src/theme';

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
    <UISettingsProvider><DataSourcesProvider><SessionProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.bgSurface,
            borderTopColor: C.border,
            borderTopWidth: 1,
            height: 48,
            paddingBottom: 7,
            paddingTop: 7,
          },
          tabBarActiveTintColor: C.textPrimary,
          tabBarInactiveTintColor: C.textDim,
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 2,
            fontFamily: F.mono,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'REFERENCE' }} />
        <Tabs.Screen name="debug" options={{ title: 'DEBUG', href: __DEV__ ? undefined : null }} />
        <Tabs.Screen name="settings" options={{ title: 'SETTINGS' }} />
      </Tabs>
    </SessionProvider></DataSourcesProvider></UISettingsProvider>
  );
}
