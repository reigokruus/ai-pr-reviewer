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