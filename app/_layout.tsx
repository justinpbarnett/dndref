import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import Head from 'expo-router/head';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UISettingsProvider, useColors } from '../src/context/ui-settings';
import { DataSourcesProvider } from '../src/context/data-sources';
import { SessionProvider } from '../src/context/session';
import { F } from '../src/theme';

function ThemedTabs() {
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
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarIconStyle: {
          height: 22,
          marginBottom: 2,
        },
        tabBarActiveTintColor: C.textPrimary,
        tabBarInactiveTintColor: C.textSecondary,
        tabBarLabelStyle: {
          fontSize: 9,
          lineHeight: 12,
          height: 12,
          fontWeight: '600',
          letterSpacing: 0.8,
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

// Cloudflare Pages can't serve paths containing '@' as static assets, so the
// bundled Ionicons TTF never loads in production. Load from CDN instead.
const IONICONS_CDN =
  'https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.4/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Ionicons: IONICONS_CDN });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Courier+Prime:wght@400;700&display=swap';
    document.head.appendChild(link);
  }, []);

  if (!fontsLoaded && Platform.OS !== 'web') return null;

  return (
    <>
      <Head>
        <title>DnD Ref</title>
        <meta name="description" content="Live entity reference for D&D sessions. Listens to your table and surfaces character, location, and item cards in real time." />
        <meta property="og:title" content="DnD Ref" />
        <meta property="og:description" content="Live entity reference for D&D sessions. Listens to your table and surfaces character, location, and item cards in real time." />
        <meta property="og:image" content="https://dndref.com/og-image.png" />
        <meta property="og:image:width" content="900" />
        <meta property="og:image:height" content="747" />
        <meta property="og:url" content="https://dndref.com" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="DnD Ref" />
        <meta name="twitter:description" content="Live entity reference for D&D sessions. Listens to your table and surfaces character, location, and item cards in real time." />
        <meta name="twitter:image" content="https://dndref.com/og-image-wide.png" />
        <meta name="twitter:image:width" content="1200" />
        <meta name="twitter:image:height" content="630" />
      </Head>
      <UISettingsProvider>
        <DataSourcesProvider>
          <SessionProvider>
            <ThemedTabs />
          </SessionProvider>
        </DataSourcesProvider>
      </UISettingsProvider>
    </>
  );
}
