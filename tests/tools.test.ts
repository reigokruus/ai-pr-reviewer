import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listFiles, readFile, resolveInsideRepo, runTool, searchCode } from '../src/tools.js';

let root: string;

beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), 'tools-test-'));
    mkdirSync(path.join(root, 'src'));
    writeFileSync(path.join(root, 'src', 'app.ts'), 'const a = 1;\nconst secret = 2;\n');
    mkdirSync(path.join(root, 'node_modules'));
    writeFileSync(path.join(root, 'node_modules', 'lib.js'), 'const secret = 3;\n');
});

afterAll(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('resolveInsideRepo', () => {
    it('allows a path inside the repository', () => {
        expect(resolveInsideRepo(root, 'src/app.ts')).toBe(path.join(root, 'src', 'app.ts'));
    });

    it('rejects a path that climbs out of the repository', () => {
        expect(() => resolveInsideRepo(root, '../../etc/passwd')).toThrow('outside the repository');
    });

    it('rejects a disguised path that climbs out', () => {
        expect(() => resolveInsideRepo(root, 'src/./../..')).toThrow('outside the repository');
    });

    it('rejects an absolute path outside the repository', () => {
        expect(() => resolveInsideRepo(root, '/etc/passwd')).toThrow('outside the repository');
    });
});

describe('readFile', () => {
    it('returns the file with line numbers', () => {
        const result = readFile(root, 'src/app.ts');

        expect(result).toContain('1: const a = 1;');
        expect(result).toContain('2: const secret = 2;');
    });
});

describe('listFiles', () => {
    it('lists folders with a slash and hides node_modules', () => {
        expect(listFiles(root, '.')).toBe('src/');
    });
});

describe('searchCode', () => {
    it('finds matches with file and line number', () => {
        expect(searchCode(root, 'secret')).toBe('src/app.ts:2: const secret = 2;');
    });

    it('does not search inside node_modules', () => {
        expect(searchCode(root, 'secret')).not.toContain('node_modules');
    });

    it('refuses an empty query', () => {
        expect(searchCode(root, '')).toContain('must not be empty');
    });
});

describe('runTool', () => {
    it('returns an error message instead of throwing for a forbidden path', () => {
        const result = runTool(root, 'read_file', { path: '../../etc/passwd' });

        expect(result).toContain('Tool error');
    });

    it('reports an unknown tool', () => {
        expect(runTool(root, 'delete_everything', {})).toBe('Unknown tool: delete_everything');
    });
});