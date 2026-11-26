import { describe, expect, it } from "vitest";

import { alignExactEnds, alignSpokenEnds } from "./match-end";

describe("match ends", () => {
  it("ends each spoken word on the character after its last letter", () => {
    const line = "Valdrath watches from the throne";
    expect(alignSpokenEnds(line, ["valdrath", "watches", "from", "the", "throne"])).toEqual([8, 16, 21, 25, 32]);
  });

  it("closes an apostrophe inside the word and ends after the last letter", () => {
    expect(alignSpokenEnds("Gaea's Cradle", ["gaeas", "cradle"])).toEqual([6, 13]);
    expect(alignSpokenEnds("Gaea\u2019s Cradle", ["gaeas", "cradle"])).toEqual([6, 13]);
  });

  it("ends a diacritic on the original character", () => {
    expect(alignSpokenEnds("sailed to Faer\u00fbn", ["sailed", "to", "faerun"])).toEqual([6, 9, 16]);
  });

  it("drops a catalog bonus before counting the next word", () => {
    expect(alignSpokenEnds("Weapon, +1, +2, or +3", ["weapon"])).toEqual([6]);
  });

  it("keeps digits in an exact name", () => {
    expect(alignExactEnds("Eight-and-a-Half-Tails", ["eight", "and", "a", "half", "tails"])).toEqual([
      5, 9, 11, 16, 22,
    ]);
  });

  it("gives up the ends rather than a different word list", () => {
    expect(alignSpokenEnds("Valdrath", ["nope"])).toEqual([8]);
  });
});
