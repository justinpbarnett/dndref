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
