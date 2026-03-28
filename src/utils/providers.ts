/**
 * Shared utility functions for API providers and data fetching.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generic pagination helper that fetches all pages from an API endpoint.
 * Extracted from SRDProvider and KankaProvider to eliminate duplication.
 * 
 * @param url - The initial URL to fetch
 * @param getNextUrl - Function to extract the next page URL from response data
 * @param options - Optional fetch options (headers, etc.)
 * @returns Array of all items from all pages
 */
export async function fetchAll<T>(
  url: string,
  getNextUrl: (data: any) => string | null,
  options?: RequestInit,
): Promise<T[]> {
  const results: T[] = [];
  let next: string | null = url;
  
  while (next) {
    const res = await fetch(next, options);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${next}`);
    const data = await res.json();
    results.push(...(data.results ?? data.data ?? []));
    next = getNextUrl(data);
  }
  
  return results;
}

/**
 * Creates a fetchAll function with standard Bearer token authentication.
 * Used by KankaProvider and similar token-based APIs.
 */
export function createTokenFetchAll(token: string) {
  return <T>(url: string, getNextUrl: (data: any) => string | null) =>
    fetchAll<T>(url, getNextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Handles CORS errors by detecting TypeError from browser fetch failures.
 * Returns a user-friendly error message for browser CORS issues.
 * 
 * @param error - The caught error
 * @param serviceName - Name of the service for the error message
 * @param fallbackMessage - Fallback action suggestion (e.g., "Use the iOS app")
 * @returns Error with appropriate message
 */
export function handleCorsError(
  error: unknown,
  serviceName: string,
  fallbackMessage = 'Use the iOS app or paste content via file upload.',
): Error {
  if (error instanceof TypeError) {
    return new Error(`Cannot reach ${serviceName} from the browser (CORS). ${fallbackMessage}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Safely parses JSON from storage, returning null on parse failure.
 * Eliminates duplicated try-catch patterns around JSON.parse.
 * 
 * @param raw - The raw JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
export function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Safely saves data to AsyncStorage with error logging.
 * Eliminates repeated error handling patterns.
 * 
 * @param key - Storage key
 * @param value - Value to serialize and store
 * @param context - Context for error logging (e.g., "data source settings")
 */
export async function safeStorageSet(
  key: string,
  value: unknown,
  context: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[dnd-ref] Failed to save ${context}:`, e);
  }
}

/**
 * Safely retrieves and parses data from AsyncStorage.
 * 
 * @param key - Storage key
 * @param context - Context for error logging
 * @returns Parsed data or null
 */
export async function safeStorageGet<T>(key: string, context: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return safeJsonParse<T>(raw);
  } catch (e) {
    console.warn(`[dnd-ref] Failed to load ${context}:`, e);
    return null;
  }
}
