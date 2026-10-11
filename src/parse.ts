import { FindingsSchema, type Finding } from './types.js';

export type ParseResult =
    | { ok: true; findings: Finding[] }
    | { ok: false; error: string };

function stripCodeFence(text: string): string {
    const trimmed = text.trim();
    const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return match?.[1] ?? trimmed;
}

export function parseFindings(text: string): ParseResult {
    let data: unknown;
    try {
        data = JSON.parse(stripCodeFence(text));
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