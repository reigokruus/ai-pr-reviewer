import Anthropic from '@anthropic-ai/sdk';
import type { AgentMessage, AgentModel, ModelTurn, ToolCall } from './agent.js';
import { TOOL_DEFINITIONS } from './tools.js';

export function getApiKey(env: NodeJS.ProcessEnv = process.env): string {
    const key = env.LLM_API_KEY;
    if (!key) {
        throw new Error('LLM_API_KEY is not set. Add it to .env locally or to GitHub Secrets in CI.');
    }
    return key;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toAnthropicMessages(history: AgentMessage[]): Anthropic.MessageParam[] {
    return history.map((message): Anthropic.MessageParam => {
        switch (message.role) {
            case 'user':
                return { role: 'user', content: message.text };

            case 'tool_results':
                return {
                    role: 'user',
                    content: message.results.map((result) => ({
                        type: 'tool_result' as const,
                        tool_use_id: result.id,
                        content: result.output,
                    })),
                };

            case 'assistant': {
                const { turn } = message;
                if (turn.type === 'final') {
                    return { role: 'assistant', content: turn.text };
                }
                const content: Anthropic.ContentBlockParam[] = [];
                if (turn.text) {
                    content.push({ type: 'text', text: turn.text });
                }
                for (const call of turn.calls) {
                    content.push({ type: 'tool_use', id: call.id, name: call.name, input: call.input });
                }
                return { role: 'assistant', content };
            }
        }
    });
}

function toModelTurn(response: Anthropic.Message): ModelTurn {
    const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

    const calls: ToolCall[] = response.content
        .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
        .map((block) => ({
            id: block.id,
            name: block.name,
            input: isRecord(block.input) ? block.input : {},
        }));

    if (calls.length > 0) {
        return { type: 'tool_calls', text, calls };
    }
    return { type: 'final', text };
}

export function createAnthropicAgentModel(apiKey: string, model: string): AgentModel {
    const anthropic = new Anthropic({ apiKey });

    return {
        async next(system, history, allowTools) {
            const response = await anthropic.messages.create({
                model,
                max_tokens: 2000,
                system,
                tools: TOOL_DEFINITIONS,
                tool_choice: allowTools ? { type: 'auto' } : { type: 'none' },
                messages: toAnthropicMessages(history),
            });
            return toModelTurn(response);
        },
    };
}