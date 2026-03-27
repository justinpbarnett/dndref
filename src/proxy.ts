import { Platform } from 'react-native';

export const CORS_PROXY = Platform.OS === 'web' ? 'https://proxy.dndref.com' : null;
