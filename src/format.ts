import { SEVERITIES, type Finding, type Severity } from "./types.js";

// Hidden marker so the workflow can recognise (and later update) its own comment.
export const COMMENT_MARKER = "<!-- ai-pr-reviewer -->";

const SECTION_TITLES: Record<Severity, string> = {
  error: "🔴 Errors",
  warning: "🟡 Warnings",
  suggestion: "🔵 Suggestions",
};

function location(finding: Finding): string {
  return finding.line === undefined
    ? `\`${finding.file}\``
    : `\`${finding.file}:${finding.line}\``;
}

export function formatReview(findings: Finding[]): string {
  const lines = [COMMENT_MARKER, "## 🤖 AI code review", ""];

  if (findings.length === 0) {
    lines.push("✅ No issues found.");
    return lines.join("\n") + "\n";
  }

  lines.push(`Found **${findings.length}** issue${findings.length === 1 ? "" : "s"}.`, "");

  for (const severity of SEVERITIES) {
    const group = findings.filter((f) => f.severity === severity);
    if (group.length === 0) continue;

    lines.push(`### ${SECTION_TITLES[severity]} (${group.length})`, "");
    for (const finding of group) {
      lines.push(`- ${location(finding)}: ${finding.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
