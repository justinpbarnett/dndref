import { Ionicons as ExpoIonicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import Head from "expo-router/head";
import React from "react";
import { Platform } from "react-native";
import { DataSourcesProvider } from "../src/context/data-sources/provider";
import { SessionProvider } from "../src/context/session";
import { UISettingsProvider } from "../src/context/ui-settings";
import { IONICONS_WEB_FONT, getIoniconsFontSource } from "../src/icon-font";
import { ThemedTabs } from "../src/navigation/ThemedTabs";
import { useWebFontStylesheet } from "../src/web-font-stylesheet";

const META_DESCRIPTION =
  "Live entity reference for D&D sessions. Listens to your table and surfaces character, location, and item cards in real time.";

export default function RootLayout() {
  const [fontsLoaded] = useFonts(
    Platform.OS === "web" ? {} : { ionicons: getIoniconsFontSource(Platform.OS, ExpoIonicons.font.ionicons) },
  );

  useWebFontStylesheet();

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
