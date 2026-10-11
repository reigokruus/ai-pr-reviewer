import { describe, it, expect } from 'vitest';
import { getDiffOptions,diffTooLargeMessage } from '../src/diff.js';

describe('getDiffOptions', () => {
    it('uses main and HEAD by default', () => {
        const options = getDiffOptions({});

        expect(options).toEqual({ base: 'main', head: 'HEAD' });
    });

    it('reads base and head from the environment', () => {
        const options = getDiffOptions({ DIFF_BASE: 'origin/main', DIFF_HEAD: 'demo-bug' });

        expect(options).toEqual({ base: 'origin/main', head: 'demo-bug' });
    });
});

describe('diffTooLargeMessage', () => {
    it('returns null when the diff is within the limit', () => {
        expect(diffTooLargeMessage('abc', 10)).toBeNull();
    });

    it('returns null when the diff is exactly at the limit', () => {
        expect(diffTooLargeMessage('abcdefghij', 10)).toBeNull();
    });

    it('explains the limit when the diff is too large', () => {
        const message = diffTooLargeMessage('a'.repeat(11), 10);

        expect(message).toContain('11 characters');
        expect(message).toContain('10 character limit');
    });
});