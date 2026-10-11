import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runAgent, type AgentMessage, type AgentModel, type ModelTurn } from '../src/agent.js';

let root: string;

beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), 'agent-test-'));
    mkdirSync(path.join(root, 'src'));
    writeFileSync(path.join(root, 'src', 'app.ts'), 'const a = 1;\n');
});

afterAll(() => {
    rmSync(root, { recursive: true, force: true });
});

function fakeModel(turns: ModelTurn[]) {
    const seenHistories: AgentMessage[][] = [];
    const seenAllowTools: boolean[] = [];
    let index = 0;

    const model: AgentModel = {
        async next(_system, history, allowTools) {
            seenHistories.push([...history]);
            seenAllowTools.push(allowTools);
            const turn = turns[index] ?? { type: 'final', text: '[]' };
            index++;
            return turn;
        },
    };

    return { model, seenHistories, seenAllowTools };
}

const readAppFile: ModelTurn = {
    type: 'tool_calls',
    text: '',
    calls: [{ id: 'call-1', name: 'read_file', input: { path: 'src/app.ts' } }],
};

describe('runAgent', () => {
    it('returns findings when the model answers straight away', async () => {
        const { model } = fakeModel([
            { type: 'final', text: '[{"file": "src/app.ts", "line": 1, "severity": "warning", "message": "Unused"}]' },
        ]);

        const result = await runAgent({ model, system: '', userMessage: 'diff', repoRoot: root });

        expect(result.ok).toBe(true);
        expect(result.steps).toEqual([]);
    });

    it('runs a requested tool and sends the result back', async () => {
        const { model, seenHistories } = fakeModel([readAppFile, { type: 'final', text: '[]' }]);

        const result = await runAgent({ model, system: '', userMessage: 'diff', repoRoot: root });

        expect(result.ok).toBe(true);
        expect(result.steps).toHaveLength(1);
        expect(result.steps[0]?.tool).toBe('read_file');

        const secondRequest = seenHistories[1] ?? [];
        const lastMessage = secondRequest.at(-1);
        expect(lastMessage).toEqual({
            role: 'tool_results',
            results: [{ id: 'call-1', output: '1: const a = 1;\n2: ' }],
        });
    });

    it('forces a final answer without tools when the step limit is reached', async () => {
        const { model, seenAllowTools } = fakeModel([readAppFile, readAppFile, { type: 'final', text: '[]' }]);

        const result = await runAgent({ model, system: '', userMessage: 'diff', repoRoot: root, maxSteps: 2 });

        expect(result.ok).toBe(true);
        expect(seenAllowTools).toEqual([true, true, false]);
    });

    it('fails when the model keeps asking for tools after the limit', async () => {
        const { model } = fakeModel([readAppFile, readAppFile, readAppFile]);

        const result = await runAgent({ model, system: '', userMessage: 'diff', repoRoot: root, maxSteps: 2 });

        expect(result.ok).toBe(false);
        expect(result.steps).toHaveLength(2);
    });

    it('fails when the final answer is not valid JSON', async () => {
        const { model } = fakeModel([{ type: 'final', text: 'Looks good to me!' }]);

        const result = await runAgent({ model, system: '', userMessage: 'diff', repoRoot: root });

        expect(result.ok).toBe(false);
    });
});