import { getDiff, getDiffOptions } from './diff.js';
import { formatReview } from './format.js';
import { createAnthropicClient, getApiKey } from './llm.js';
import { parseFindings } from './parse.js';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js';

const options = getDiffOptions();
const diff = getDiff(options);

if (diff.trim() === '') {
    console.log('No changes to review.');
} else {
    const model = process.env.LLM_MODEL ?? 'claude-haiku-5-5';
    const client = createAnthropicClient(getApiKey(), model);

    const reply = await client.complete(SYSTEM_PROMPT, buildUserMessage(diff));
    const parsed = parseFindings(reply);

    if (parsed.ok) {
        console.log(formatReview(parsed.findings));
    } else {
        console.error(parsed.error);
        console.error('Raw reply:', reply);
        process.exitCode = 1;
    }
}