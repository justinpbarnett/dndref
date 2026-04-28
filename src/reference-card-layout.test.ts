import { describe, expect, test } from "vitest";

import { computeReferenceCardLayout, type CardSize } from "./reference-card-layout";

const cards = ["a", "b", "c", "d", "e"].map((instanceId) => ({ instanceId }));

describe("computeReferenceCardLayout", () => {
  test.each([
    ["portrait", "S", { width: 768, height: 1024 }, 3, 242.66666666666666],
    ["portrait", "M", { width: 768, height: 1024 }, 2, 369],
    ["portrait", "L", { width: 768, height: 1024 }, 2, 369],
    ["portrait", "XL", { width: 768, height: 1024 }, 1, 380],
    ["landscape", "S", { width: 1440, height: 900 }, 4, 347.5],
    ["landscape", "M", { width: 1440, height: 900 }, 3, 380],
    ["landscape", "L", { width: 1440, height: 900 }, 2, 380],
    ["landscape", "XL", { width: 1440, height: 900 }, 2, 380],
  ] satisfies Array<[string, CardSize, { width: number; height: number }, number, number]>)(
    "uses %s %s columns within the readable width",
    (_orientation, cardSize, viewport, columns, cardWidth) => {
      const layout = computeReferenceCardLayout({ cards, measuredHeights: {}, viewport, cardSize });

      expect(layout.columns).toBe(columns);
      expect(layout.cardWidth).toBeCloseTo(cardWidth, 6);
    },
  );

  test("centers constrained single-column XL portrait cards", () => {
    const layout = computeReferenceCardLayout({
      cards: cards.slice(0, 1),
      measuredHeights: {},
      viewport: { width: 768, height: 1024 },
      cardSize: "XL",
    });

    expect(layout.columns).toBe(1);
    expect(layout.gridWidth).toBe(400);
    expect(layout.xOffset).toBe(184);
    expect(layout.positions.a).toEqual({ x: 189, y: 5 });
  });

  test("uses measured row heights for positions and content height", () => {
    const layout = computeReferenceCardLayout({
      cards,
      measuredHeights: {
        a: 160,
        b: 240,
        c: 180,
        d: 320,
        e: 150,
      },
      viewport: { width: 1440, height: 900 },
      cardSize: "M",
    });

    expect(layout.columns).toBe(3);
    expect(layout.positions).toEqual({
      a: { x: 135, y: 5 },
      b: { x: 525, y: 5 },
      c: { x: 915, y: 5 },
      d: { x: 135, y: 245 },
      e: { x: 525, y: 245 },
    });
    expect(layout.totalHeight).toBe(570);
  });

  test("falls back to the default card height until rows are measured", () => {
    const layout = computeReferenceCardLayout({
      cards: cards.slice(0, 4),
      measuredHeights: { a: 220 },
      viewport: { width: 1440, height: 900 },
      cardSize: "M",
    });

    expect(layout.positions.d).toEqual({ x: 135, y: 225 });
    expect(layout.totalHeight).toBe(430);
  });
});
