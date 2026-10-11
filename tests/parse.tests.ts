import { describe, it, expect } from 'vitest';
import { parseFindings } from '../src/parse.js';

describe('parseFindings', () => {
    it('accepts a valid list of findings', () => {
        const reply = '[{"file": "a.ts", "line": 3, "severity": "error", "message": "Bug"}]';

        const result = parseFindings(reply);

        expect(result).toEqual({
            ok: true,
            findings: [{ file: 'a.ts', line: 3, severity: 'error', message: 'Bug' }],
        });
    });

    it('accepts an empty list', () => {
        expect(parseFindings('[]')).toEqual({ ok: true, findings: [] });
    });

    it('removes a markdown code fence around the JSON', () => {
        const reply = '```json\n[{"file": "a.ts", "severity": "warning", "message": "Hmm"}]\n```';

        const result = parseFindings(reply);

        expect(result.ok).toBe(true);
    });

    it('rejects text that is not JSON', () => {
        const result = parseFindings('Looks good to me!');

        expect(result.ok).toBe(false);
    });

    it('rejects an unknown severity', () => {
        const reply = '[{"file": "a.ts", "severity": "critical", "message": "Bug"}]';

        const result = parseFindings(reply);

        expect(result.ok).toBe(false);
    });

    it('rejects a finding without a file', () => {
        const reply = '[{"severity": "error", "message": "Bug"}]';

        expect(parseFindings(reply).ok).toBe(false);
    });
});