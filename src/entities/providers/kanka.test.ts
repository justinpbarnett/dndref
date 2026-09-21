import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchAllMock = vi.hoisted(() => vi.fn());

vi.mock("../../utils/providers", () => ({ fetchAll: fetchAllMock }));

import { KankaProvider } from "./kanka";

const onlyCharacters = (characters: unknown[]) => async (url: string) =>
  url.includes("/characters") ? characters : [];

describe("KankaProvider", () => {
  beforeEach(() => {
    fetchAllMock.mockReset();
  });

  it("detects a campaign entity by the aliases its source carries", async () => {
    fetchAllMock.mockImplementation(
      onlyCharacters([
        {
          id: 42,
          name: "Valdrath the Undying",
          aliases: ["Valdrath", " the Lich King "],
          entry: "<p>Ancient lich.</p>",
        },
      ]),
    );

    expect(await new KankaProvider("token", 7).load()).toEqual([
      {
        id: "kanka-characters-42",
        name: "Valdrath the Undying",
        type: "NPC",
        aliases: ["Valdrath", "the Lich King"],
        summary: "Ancient lich.",
      },
    ]);
  });

  it("types each campaign entity by the resource it came from", async () => {
    fetchAllMock.mockImplementation(async (url: string) =>
      url.includes("/organisations") ? [{ id: 3, name: "Dawnwarden Order", entry: "" }] : [],
    );

    expect(await new KankaProvider("token", 7).load()).toMatchObject([
      { id: "kanka-organisations-3", type: "Faction", summary: "" },
    ]);
  });

  it("drops campaign entities with no name rather than naming them Unknown", async () => {
    fetchAllMock.mockImplementation(onlyCharacters([{ id: 9, entry: "<p>A rumor.</p>" }]));

    expect(await new KankaProvider("token", 7).load()).toEqual([]);
  });

  it("keeps only custom campaign artwork", async () => {
    fetchAllMock.mockImplementation(
      onlyCharacters([
        { id: 1, name: "With Art", has_custom_image: true, image_thumb: "https://kanka.io/a.png" },
        { id: 2, name: "Without Art", has_custom_image: false, image_thumb: "https://kanka.io/default.png" },
      ]),
    );

    const entities = await new KankaProvider("token", 7).load();

    expect(entities.map((e) => e.image)).toEqual(["https://kanka.io/a.png", undefined]);
  });
});
