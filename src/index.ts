import { appendFileSync, writeFileSync } from 'node:fs';
import { runAgent } from './agent.js';
import { getDiff, getDiffOptions } from './diff.js';
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

const options = getDiffOptions();
const diff = getDiff(options);

if (diff.trim() === '') {
    const message = '## AI code review\n\nNo changes to review.';
    console.log(message);
    writeFileSync(REVIEW_FILE, message);
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
        const review = formatReview(result.findings);
        console.log(review);
        writeFileSync(REVIEW_FILE, review);
        writeSummary(review);
    } else {
        console.error(result.error);
        writeSummary(`**Review failed:** ${result.error}`);
        process.exitCode = 1;
    }
}