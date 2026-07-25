import { describe, expect, it } from "vitest";
import { componentRecordFixtures } from "../model/fixtures/componentRecords";
import { isReviewOverdue } from "../model/compliance";
import { loadCompliantComponents } from "../services/loadCompliantComponents";

describe("loadCompliantComponents", () => {
  it("returns compliant components only in deterministic order", () => {
    const results = loadCompliantComponents(componentRecordFixtures);

    expect(results.map((record) => record.name)).toEqual(["AppRibbon", "GlassPanel"]);
    expect(results.every((record) => record.complianceStatus === "compliant")).toBe(true);
  });

  it("supports overdue derivation from review date and cadence", () => {
    const [first] = loadCompliantComponents(componentRecordFixtures, {
      now: new Date("2026-12-01T00:00:00.000Z"),
    });

    expect(isReviewOverdue(first, new Date("2026-12-01T00:00:00.000Z"))).toBe(true);
  });
});

