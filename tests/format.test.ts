import { describe, it, expect } from 'vitest';
import { formatReview } from '../src/format.js';
import type { Finding } from '../src/types.js';

describe('formatReview', () => {
    it('says no issues were found when the list is empty', () => {
        const result = formatReview([]);

        expect(result).toBe('## AI code review\n\nNo issues found.');
    });

    it('shows a summary with correct counts and plurals', () => {
        const findings: Finding[] = [
            { file: 'a.ts', severity: 'error', message: 'First' },
            { file: 'b.ts', severity: 'error', message: 'Second' },
            { file: 'c.ts', severity: 'warning', message: 'Third' },
        ];

        const result = formatReview(findings);

        expect(result).toContain('**2 errors, 1 warning**');
    });

    it('lists errors before warnings, whatever the input order', () => {
        const findings: Finding[] = [
            { file: 'a.ts', severity: 'warning', message: 'A warning' },
            { file: 'b.ts', severity: 'error', message: 'An error' },
        ];

        const result = formatReview(findings);

        expect(result.indexOf('### Errors')).toBeLessThan(result.indexOf('### Warnings'));
    });

    it('adds the line number only when it is given', () => {
        const findings: Finding[] = [
            { file: 'with-line.ts', line: 7, severity: 'error', message: 'Has line' },
            { file: 'no-line.ts', severity: 'error', message: 'No line' },
        ];

        const result = formatReview(findings);

        expect(result).toContain('`with-line.ts:7`');
        expect(result).toContain('`no-line.ts`:');
    });

    it('leaves out sections that have no findings', () => {
        const findings: Finding[] = [
            { file: 'a.ts', severity: 'error', message: 'Only an error' },
        ];

        const result = formatReview(findings);

        expect(result).not.toContain('### Warnings');
        expect(result).not.toContain('### Suggestions');
    });
});