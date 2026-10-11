import { execFileSync } from 'node:child_process';

export interface DiffOptions {
    base: string;
    head: string;
}

export function getDiffOptions(env: NodeJS.ProcessEnv = process.env): DiffOptions {
    return {
        base: env.DIFF_BASE ?? 'main',
        head: env.DIFF_HEAD ?? 'HEAD',
    };
}

export function getDiff(options: DiffOptions): string {
    return execFileSync('git', ['diff', `${options.base}...${options.head}`], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
    });
}

export const MAX_DIFF_CHARS = 60_000;

export function diffTooLargeMessage(diff: string, limit: number = MAX_DIFF_CHARS): string | null {
    if (diff.length <= limit) {
        return null;
    }

    const size = diff.length.toLocaleString('en-US');
    const max = limit.toLocaleString('en-US');
    return (
        '## AI code review\n\n' +
        `This pull request changes ${size} characters, more than the ${max} character limit for an automated review. ` +
        'Consider splitting it into smaller pull requests.'
    );
}