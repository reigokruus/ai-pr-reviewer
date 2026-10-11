import { describe, it, expect } from 'vitest';
import { getDiffOptions } from '../src/diff.js';

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