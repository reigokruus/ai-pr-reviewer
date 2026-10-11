import { FindingsSchema, type Finding } from './types.js';

export type ParseResult =
    | { ok: true; findings: Finding[] }
    | { ok: false; error: string };

function extractJsonArray(text: string): string {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end < start) {
        return text.trim();
    }
    return text.slice(start, end + 1);
}

export function parseFindings(text: string): ParseResult {
    let data: unknown;
    try {
        data = JSON.parse(extractJsonArray(text));
    } catch {
        return { ok: false, error: 'The model reply was not valid JSON.' };
    }

    const result = FindingsSchema.safeParse(data);
    if (!result.success) {
        const details = result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ');
        return { ok: false, error: `The model reply had the wrong shape: ${details}` };
    }

    return { ok: true, findings: result.data };
}