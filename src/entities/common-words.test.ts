import { describe, expect, it } from "vitest";

import { englishWords, isEnglishWord } from "./common-words";

describe("english words", () => {
  it("holds every four- to six-letter entry once", () => {
    const words = englishWords();
    expect(words).toHaveLength(52981);
    expect(new Set(words).size).toBe(words.length);
  });

  it.each(["wore", "ropes", "harp", "hardy", "drown", "ogle", "lama", "kale", "keel", "mire", "liar", "lire", "bran"])(
    "includes %s",
    (word) => {
      expect(isEnglishWord(word)).toBe(true);
    },
  );

  it.each(["gorn", "goorm", "gormm"])("does not include the mishearing %s", (word) => {
    expect(isEnglishWord(word)).toBe(false);
  });
});
