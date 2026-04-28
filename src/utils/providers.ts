/**
 * Shared utility functions for API providers and data fetching.
 */

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
  fallbackMessage = "Use the iOS app or paste content via file upload.",
): Error {
  if (error instanceof TypeError) {
    return new Error(`Cannot reach ${serviceName} from the browser (CORS). ${fallbackMessage}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}
