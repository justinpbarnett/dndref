import { Ionicons as ExpoIonicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Tabs } from "expo-router";
import Head from "expo-router/head";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicon } from "../src/components/Ionicon";
import { DataSourcesProvider } from "../src/context/data-sources";
import { SessionProvider } from "../src/context/session";
import { UISettingsProvider, useColors } from "../src/context/ui-settings";
import { IONICONS_WEB_FONT, getIoniconsFontSource } from "../src/icon-font";
import { F } from "../src/theme";

const META_DESCRIPTION =
  "Live entity reference for D&D sessions. Listens to your table and surfaces character, location, and item cards in real time.";
const GOOGLE_FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Courier+Prime:wght@400;700&display=swap";

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
      {(
        [
          { name: "index", title: "REFERENCE", icon: "layers-outline", focusedIcon: "layers" },
          { name: "debug", title: "DEBUG", icon: "bug-outline", focusedIcon: "bug", href: __DEV__ ? undefined : null },
          { name: "settings", title: "SETTINGS", icon: "settings-outline", focusedIcon: "settings" },
        ] as const
      ).map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            href: "href" in tab ? tab.href : undefined,
            tabBarIcon: ({ color, focused }) => (
              <Ionicon name={focused ? tab.focusedIcon : tab.icon} size={20} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(
    Platform.OS === "web" ? {} : { ionicons: getIoniconsFontSource(Platform.OS, ExpoIonicons.font.ionicons) },
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONT_STYLESHEET;
    document.head.appendChild(link);
  }, []);

  if (!fontsLoaded && Platform.OS !== "web") return null;

  return (
    <>
      <Head>
        <title>DnD Ref</title>
        {Platform.OS === "web" && (
          <>
            <style>
              {`@font-face{font-family:"ionicons";src:url("${IONICONS_WEB_FONT}") format("truetype");font-display:block}`}
            </style>
            <link rel="preload" href={IONICONS_WEB_FONT} as="font" type="font/ttf" crossOrigin="" />
          </>
        )}
        <meta name="description" content={META_DESCRIPTION} />
        <meta property="og:title" content="DnD Ref" />
        <meta property="og:description" content={META_DESCRIPTION} />
        <meta property="og:image" content="https://dndref.com/og-image.png" />
        <meta property="og:image:width" content="900" />
        <meta property="og:image:height" content="747" />
        <meta property="og:url" content="https://dndref.com" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="DnD Ref" />
        <meta name="twitter:description" content={META_DESCRIPTION} />
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
