import type { Finding, Severity } from './types.js';

const SEVERITY_ORDER: Severity[] = ['error', 'warning', 'suggestion'];

const HEADINGS: Record<Severity, string> = {
    error: 'Errors',
    warning: 'Warnings',
    suggestion: 'Suggestions',
};

function formatLocation(finding: Finding): string {
    if (finding.line !== undefined) {
        return `${finding.file}:${finding.line}`;
    }
    return finding.file;
}

function formatCount(count: number, word: string): string {
    const plural = count === 1 ? '' : 's';
    return `${count} ${word}${plural}`;
}

export function formatReview(findings: Finding[]): string {
    const lines: string[] = ['## AI code review', ''];

    if (findings.length === 0) {
        lines.push('No issues found.');
        return lines.join('\n');
    }

    const summaryParts: string[] = [];
    for (const severity of SEVERITY_ORDER) {
        const count = findings.filter((f) => f.severity === severity).length;
        if (count > 0) {
            summaryParts.push(formatCount(count, severity));
        }
    }
    lines.push(`**${summaryParts.join(', ')}**`);

    for (const severity of SEVERITY_ORDER) {
        const group = findings.filter((f) => f.severity === severity);
        if (group.length === 0) {
            continue;
        }

        lines.push('', `### ${HEADINGS[severity]}`);
        for (const finding of group) {
            lines.push(`- \`${formatLocation(finding)}\`: ${finding.message}`);
        }
    }

    return lines.join('\n');
}