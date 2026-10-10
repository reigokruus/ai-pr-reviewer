import { describe, expect, it } from "vitest";
import { COMMENT_MARKER, formatReview } from "../src/format.js";
import type { Finding } from "../src/types.js";

describe("formatReview", () => {
  it("says no issues were found for an empty list", () => {
    const output = formatReview([]);

    expect(output).toContain("No issues found");
    expect(output).not.toContain("###");
  });

  it("always starts with the hidden marker and a heading", () => {
    const output = formatReview([]);

    expect(output.startsWith(COMMENT_MARKER)).toBe(true);
    expect(output).toContain("## 🤖 AI code review");
  });

  it("groups findings by severity, most severe first", () => {
    const findings: Finding[] = [
      { file: "a.ts", severity: "suggestion", message: "rename variable" },
      { file: "b.ts", line: 3, severity: "error", message: "null dereference" },
      { file: "c.ts", severity: "warning", message: "unused import" },
      { file: "d.ts", line: 9, severity: "error", message: "off-by-one" },
    ];

    const output = formatReview(findings);

    const errors = output.indexOf("Errors (2)");
    const warnings = output.indexOf("Warnings (1)");
    const suggestions = output.indexOf("Suggestions (1)");
    expect(errors).toBeGreaterThan(-1);
    expect(errors).toBeLessThan(warnings);
    expect(warnings).toBeLessThan(suggestions);
    expect(output).toContain("Found **4** issues.");
  });

  it("shows file:line when a line is given and only the file otherwise", () => {
    const output = formatReview([
      { file: "src/db.ts", line: 42, severity: "error", message: "SQL injection" },
      { file: "README.md", severity: "suggestion", message: "typo" },
    ]);

    expect(output).toContain("- `src/db.ts:42`: SQL injection");
    expect(output).toContain("- `README.md`: typo");
  });

  it("leaves out sections that have no findings", () => {
    const output = formatReview([
      { file: "x.ts", severity: "warning", message: "only one" },
    ]);

    expect(output).not.toContain("Errors");
    expect(output).not.toContain("Suggestions");
    expect(output).toContain("Found **1** issue.");
  });
});
