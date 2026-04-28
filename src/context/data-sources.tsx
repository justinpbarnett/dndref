import AsyncStorage from "@react-native-async-storage/async-storage";

export const appDataStorage = {
  getAllKeys: () => AsyncStorage.getAllKeys(),
  getItem: (key: string) => AsyncStorage.getItem(key),
  multiRemove: (keys: string[]) => AsyncStorage.multiRemove(keys),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
};
