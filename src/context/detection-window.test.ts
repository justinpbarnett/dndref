import { describe, expect, it } from "vitest";

import { DETECTION_TUNING } from "../entities/detection-tuning";
import { buildDetectionInput, nextDetectionContext } from "./detection-window";

describe("detection transcript windows", () => {
  it("carries previous active transcript into the next detection input", () => {
    const carried = nextDetectionContext("The party reached Red");

    expect(buildDetectionInput(carried, "Oak Keep before sunset")).toBe(
      "The party reached Red Oak Keep before sunset",
    );
  });

  it("carries only the tail of a long session transcript", () => {
    const carried = nextDetectionContext(`${"the party argues about rations. ".repeat(20)}Red Oak Keep`);

    expect(carried).toHaveLength(DETECTION_TUNING.carryOverChars);
    expect(carried.endsWith("Red Oak Keep")).toBe(true);
  });

  it("can intentionally drop context so paused transcript is not carried after resume", () => {
    const skippedWhilePaused = nextDetectionContext("The party reached Red");

    expect(skippedWhilePaused).toContain("Red");
    expect(buildDetectionInput("", "Oak Keep before sunset")).toBe("Oak Keep before sunset");
  });
});
