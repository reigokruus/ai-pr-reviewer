import { describe, expect, it } from "vitest";
import { FindingSchema } from "../src/types.js";

describe("FindingSchema", () => {
  it("accepts a finding without a line number", () => {
    const result = FindingSchema.safeParse({
      file: "a.ts",
      severity: "warning",
      message: "hmm",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown severity", () => {
    const result = FindingSchema.safeParse({
      file: "a.ts",
      severity: "critical",
      message: "hmm",
    });
    expect(result.success).toBe(false);
  });
});
