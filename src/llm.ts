import Anthropic from '@anthropic-ai/sdk';

export interface LlmClient {
    complete(system: string, userMessage: string): Promise<string>;
}

export function getApiKey(env: NodeJS.ProcessEnv = process.env): string {
    const key = env.LLM_API_KEY;
    if (!key) {
        throw new Error('LLM_API_KEY is not set. Add it to .env locally or to GitHub Secrets in CI.');
    }
    return key;
}

export function createAnthropicClient(apiKey: string, model: string): LlmClient {
    const anthropic = new Anthropic({ apiKey });

    return {
        async complete(system, userMessage) {
            const response = await anthropic.messages.create({
                model,
                max_tokens: 2000,
                system,
                messages: [{ role: 'user', content: userMessage }],
            });

            const textBlock = response.content.find((block) => block.type === 'text');
            if (!textBlock || textBlock.type !== 'text') {
                throw new Error('The model returned no text.');
            }
            return textBlock.text;
        },
    };
}