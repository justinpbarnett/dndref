import { beforeEach, describe, expect, it, vi } from "vitest";

const platform = vi.hoisted(() => ({ OS: "web" }));
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("react-native", () => ({ Platform: platform }));

import corsProxyWorker from "../workers/cors-proxy/index";
import { PROXY_UPSTREAMS, type ProxyRoute } from "./proxy-routes";
import { fetchUpstream, upstreamUrl } from "./proxy";

const ROUTES = Object.keys(PROXY_UPSTREAMS) as ProxyRoute[];

describe("outbound world source requests", () => {
  beforeEach(() => {
    platform.OS = "web";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends every route through the proxy on web", () => {
    expect(ROUTES.map((route) => upstreamUrl(route, "/v1/ping"))).toEqual([
      "https://proxy.dndref.com/notion/v1/ping",
      "https://proxy.dndref.com/google-docs/v1/ping",
      "https://proxy.dndref.com/anthropic/v1/ping",
    ]);
  });

  it("calls the upstream directly on native", () => {
    platform.OS = "ios";

    expect(ROUTES.map((route) => upstreamUrl(route, "/v1/ping"))).toEqual([
      "https://api.notion.com/v1/ping",
      "https://docs.google.com/v1/ping",
      "https://api.anthropic.com/v1/ping",
    ]);
  });

  // The Worker is the other half of the route table. Driving the real Worker
  // with the URLs the app builds is what keeps the two halves from drifting.
  it.each(ROUTES)("routes a proxied %s request to its upstream", async (route) => {
    fetchMock.mockResolvedValue(new Response("ok"));

    await corsProxyWorker.fetch(
      new Request(`${upstreamUrl(route, "/v1/things?cursor=2")}`, { headers: { Origin: "https://dndref.com" } }),
    );

    expect(fetchMock).toHaveBeenCalledWith(`${PROXY_UPSTREAMS[route]}/v1/things?cursor=2`, expect.anything());
  });

  it("names the source when the browser blocks the request", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchUpstream("notion", "/v1/ping", { sourceName: "Notion API" })).rejects.toThrow(
      "Cannot reach Notion API from the browser (CORS). Use the iOS app or paste content via file upload.",
    );
  });
});
