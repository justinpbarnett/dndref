import { Platform } from "react-native";

import { PROXY_UPSTREAMS, type ProxyRoute } from "./proxy-routes";
import { handleCorsError } from "./utils/providers";

const PROXY_ORIGIN = "https://proxy.dndref.com";

export type { ProxyRoute };

/**
 * The browser cannot reach a world source directly -- none of them send CORS
 * headers -- so web goes through the proxy Worker. Native calls the upstream.
 */
export const usesProxy = (): boolean => Platform.OS === "web";

/** Where a request for `path` on `route` actually goes from this platform. */
export const upstreamUrl = (route: ProxyRoute, path: string): string =>
  usesProxy() ? `${PROXY_ORIGIN}/${route}${path}` : `${PROXY_UPSTREAMS[route]}${path}`;

/**
 * Fetch from a world source, turning the browser's opaque CORS failure into an
 * error that names the source and says what to do instead.
 */
export async function fetchUpstream(
  route: ProxyRoute,
  path: string,
  options: RequestInit & { sourceName: string; fallbackMessage?: string },
): Promise<Response> {
  const { sourceName, fallbackMessage, ...init } = options;
  try {
    return await fetch(upstreamUrl(route, path), init);
  } catch (e: unknown) {
    throw handleCorsError(e, sourceName, fallbackMessage);
  }
}
