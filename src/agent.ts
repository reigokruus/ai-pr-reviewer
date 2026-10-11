import { parseFindings } from './parse.js';
import { runTool } from './tools.js';
import type { Finding } from './types.js';

export interface ToolCall {
    id: string;
    name: string;
    input: Record<string, unknown>;
}

export type ModelTurn =
    | { type: 'tool_calls'; text: string; calls: ToolCall[] }
    | { type: 'final'; text: string };

export interface ToolResult {
    id: string;
    output: string;
}

export type AgentMessage =
    | { role: 'user'; text: string }
    | { role: 'assistant'; turn: ModelTurn }
    | { role: 'tool_results'; results: ToolResult[] };

export interface AgentModel {
    next(system: string, history: AgentMessage[], allowTools: boolean): Promise<ModelTurn>;
}

export interface StepLog {
    step: number;
    tool: string;
    input: Record<string, unknown>;
    outputLength: number;
}

export type AgentResult =
    | { ok: true; findings: Finding[]; steps: StepLog[] }
    | { ok: false; error: string; steps: StepLog[]; rawReply?: string };

export interface AgentOptions {
    model: AgentModel;
    system: string;
    userMessage: string;
    repoRoot: string;
    maxSteps?: number;
}

export async function runAgent(options: AgentOptions): Promise<AgentResult> {
    const { model, system, userMessage, repoRoot, maxSteps = 8 } = options;

    const history: AgentMessage[] = [{ role: 'user', text: userMessage }];
    const steps: StepLog[] = [];

    for (let step = 1; step <= maxSteps; step++) {
        const turn = await model.next(system, history, true);
        history.push({ role: 'assistant', turn });

        if (turn.type === 'final') {
            return finish(turn.text, steps);
        }

        const results: ToolResult[] = turn.calls.map((call) => {
            const output = runTool(repoRoot, call.name, call.input);
            steps.push({ step, tool: call.name, input: call.input, outputLength: output.length });
            return { id: call.id, output };
        });
        history.push({ role: 'tool_results', results });
    }

    const lastTurn = await model.next(system, history, false);
    if (lastTurn.type !== 'final') {
        return { ok: false, error: 'The agent did not finish within the step limit.', steps };
    }
    return finish(lastTurn.text, steps);
}

function finish(text: string, steps: StepLog[]): AgentResult {
    const parsed = parseFindings(text);
    if (parsed.ok) {
        return { ok: true, findings: parsed.findings, steps };
    }
    return { ok: false, error: parsed.error, steps, rawReply: text };
}