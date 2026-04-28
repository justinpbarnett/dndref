import { useEffect } from "react";
import { Platform } from "react-native";

const GOOGLE_FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Courier+Prime:wght@400;700&display=swap";

export function useWebFontStylesheet(): void {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONT_STYLESHEET;
    document.head.appendChild(link);
  }, []);
}
