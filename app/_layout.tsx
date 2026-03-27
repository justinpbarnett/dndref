import { Tabs } from 'expo-router';
import React from 'react';
import { UISettingsProvider } from '../src/context/ui-settings';
import { DataSourcesProvider } from '../src/context/data-sources';
import { SessionProvider } from '../src/context/session';
import { C, F } from '../src/theme';

export default function RootLayout() {
  return (
    <UISettingsProvider><DataSourcesProvider><SessionProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.bgSurface,
            borderTopColor: C.border,
            borderTopWidth: 1,
            height: 44,
            paddingBottom: 6,
            paddingTop: 6,
          },
          tabBarActiveTintColor: C.textPrimary,
          tabBarInactiveTintColor: C.textDim,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.5,
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
