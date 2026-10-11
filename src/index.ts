import { runAgent } from './agent.js';
import { getDiff, getDiffOptions } from './diff.js';
import { formatReview } from './format.js';
import { createAnthropicAgentModel, getApiKey } from './llm.js';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js';

const options = getDiffOptions();
const diff = getDiff(options);

if (diff.trim() === '') {
    console.log('No changes to review.');
} else {
    const modelName = process.env.LLM_MODEL ?? 'claude-haiku-5-5';
    const model = createAnthropicAgentModel(getApiKey(), modelName);

    const result = await runAgent({
        model,
        system: SYSTEM_PROMPT,
        userMessage: buildUserMessage(diff),
        repoRoot: process.env.REPO_ROOT ?? process.cwd(),
    });

    console.log('Agent steps:');
    for (const step of result.steps) {
        console.log(`  ${step.step}. ${step.tool} ${JSON.stringify(step.input)} -> ${step.outputLength} chars`);
    }
    console.log('');

    if (result.ok) {
        console.log(formatReview(result.findings));
    } else {
        console.error(result.error);
        process.exitCode = 1;
    }
}