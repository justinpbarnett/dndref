import { Alert, Platform } from "react-native";

export type PickedTextFile = { name: string; text: () => Promise<string> };

const DELETE_ALL_MESSAGE =
  "This deletes uploads, pasted content, AI parsed files, saved settings, API keys, source URLs, cached SRD data, and the current session on this device.";

export function pickFilesWithWebInput(): Promise<PickedTextFile[]> {
  if (Platform.OS !== "web" || typeof document === "undefined") return Promise.resolve([]);

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".md,.txt,.json";
    input.onchange = () => {
      const files = Array.from(input.files ?? [], (file) => ({
        name: file.name,
        text: () => file.text(),
      }));
      input.onchange = null;
      resolve(files);
    };
    input.click();
  });
}

export function confirmDeleteAllData(): Promise<boolean> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return Promise.resolve(window.confirm(`Delete all local app data?\n\n${DELETE_ALL_MESSAGE}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      "Delete all local app data?",
      DELETE_ALL_MESSAGE,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Delete All Data", style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
