import { appendFileSync, writeFileSync } from 'node:fs';
import { runAgent } from './agent.js';
import { diffTooLargeMessage, getDiff, getDiffOptions } from './diff.js';
import { formatReview, formatSteps } from './format.js';
import { createAnthropicAgentModel, getApiKey } from './llm.js';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js';

const REVIEW_FILE = 'review.md';

function writeSummary(text: string): void {
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) {
        appendFileSync(summaryPath, `${text}\n\n`);
    }
}

function publish(review: string): void {
    console.log(review);
    writeFileSync(REVIEW_FILE, review);
    writeSummary(review);
}

const options = getDiffOptions();
const diff = getDiff(options);
const tooLarge = diffTooLargeMessage(diff);

if (diff.trim() === '') {
    publish('## AI code review\n\nNo changes to review.');
} else if (tooLarge !== null) {
    publish(tooLarge);
} else {
    const modelName = process.env.LLM_MODEL ?? 'claude-haiku-5-5';
    const model = createAnthropicAgentModel(getApiKey(), modelName);

    const result = await runAgent({
        model,
        system: SYSTEM_PROMPT,
        userMessage: buildUserMessage(diff),
        repoRoot: process.env.REPO_ROOT ?? process.cwd(),
    });

    const stepsText = formatSteps(result.steps);
    console.log(stepsText);
    writeSummary(stepsText);

    if (result.ok) {
        publish(formatReview(result.findings));
    } else {
        console.error(result.error);
        writeSummary(`**Review failed:** ${result.error}`);
        process.exitCode = 1;
    }
}