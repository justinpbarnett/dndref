/**
 * The CORS proxy route table -- the one place a route and its upstream are paired.
 *
 * Both sides of the proxy read it: the app builds outbound URLs from it (see
 * `src/proxy.ts`), and the Worker that answers them imports it to decide where
 * each path goes (see `workers/cors-proxy/index.ts`). Adding a world source is
 * one edit here. This file must stay dependency-free so the Worker can bundle
 * it -- no `react-native`, no platform checks.
 *
 * A new route only works on web once the Worker ships it: `just proxy-deploy`.
 */
export const PROXY_UPSTREAMS = {
  notion: "https://api.notion.com",
  "google-docs": "https://docs.google.com",
  homebrewery: "https://homebrewery.naturalcrit.com",
  anthropic: "https://api.anthropic.com",
} as const;

export type ProxyRoute = keyof typeof PROXY_UPSTREAMS;
