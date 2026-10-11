import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const IGNORED_NAMES = new Set(['node_modules', '.git', 'package-lock.json']);
const MAX_LINES = 300;
const MAX_MATCHES = 50;

export function resolveInsideRepo(root: string, relativePath: string): string {
    const absoluteRoot = path.resolve(root);
    const target = path.resolve(absoluteRoot, relativePath);
    const relative = path.relative(absoluteRoot, target);

    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error(`Path is outside the repository: ${relativePath}`);
    }
    return target;
}

export function readFile(root: string, filePath: string): string {
    const fullPath = resolveInsideRepo(root, filePath);
    const lines = readFileSync(fullPath, 'utf8').split('\n');

    const numbered = lines
        .slice(0, MAX_LINES)
        .map((line, index) => `${index + 1}: ${line}`);

    if (lines.length > MAX_LINES) {
        numbered.push(`... (${lines.length - MAX_LINES} more lines not shown)`);
    }
    return numbered.join('\n');
}

export function listFiles(root: string, dirPath: string): string {
    const fullPath = resolveInsideRepo(root, dirPath);

    return readdirSync(fullPath, { withFileTypes: true })
        .filter((entry) => !IGNORED_NAMES.has(entry.name))
        .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
        .sort()
        .join('\n');
}

function collectFiles(dir: string, files: string[]): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (IGNORED_NAMES.has(entry.name)) {
            continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectFiles(fullPath, files);
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }
}

export function searchCode(root: string, query: string): string {
    if (query.trim() === '') {
        return 'The search query must not be empty.';
    }

    const absoluteRoot = path.resolve(root);
    const files: string[] = [];
    collectFiles(absoluteRoot, files);

    const matches: string[] = [];
    for (const file of files) {
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, index) => {
            if (matches.length < MAX_MATCHES && line.includes(query)) {
                matches.push(`${path.relative(absoluteRoot, file)}:${index + 1}: ${line.trim()}`);
            }
        });
        if (matches.length >= MAX_MATCHES) {
            break;
        }
    }

    return matches.length > 0 ? matches.join('\n') : 'No matches found.';
}

export interface ToolDefinition {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, { type: 'string'; description: string }>;
        required: string[];
    };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
    {
        name: 'read_file',
        description:
            'Read a file from the repository. Lines are prefixed with their line numbers. ' +
            'Use this to see the full context of a change and to get exact line numbers.',
        input_schema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File path relative to the repository root, e.g. src/users.ts' },
            },
            required: ['path'],
        },
    },
    {
        name: 'list_files',
        description: 'List the files and folders in a directory of the repository. Folders end with a slash.',
        input_schema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path relative to the repository root. Use . for the root.' },
            },
            required: ['path'],
        },
    },
    {
        name: 'search_code',
        description:
            'Search all repository files for an exact piece of text. ' +
            'Use this to find where a changed function or variable is used.',
        input_schema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The exact text to search for, e.g. a function name.' },
            },
            required: ['query'],
        },
    },
];

export function runTool(root: string, name: string, input: Record<string, unknown>): string {
    try {
        switch (name) {
            case 'read_file':
                return readFile(root, String(input.path ?? ''));
            case 'list_files':
                return listFiles(root, String(input.path ?? '.'));
            case 'search_code':
                return searchCode(root, String(input.query ?? ''));
            default:
                return `Unknown tool: ${name}`;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `Tool error: ${message}`;
    }
}