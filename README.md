# AI PR Reviewer

![CI](https://github.com/reigokruus/ai-pr-reviewer/actions/workflows/ci.yml/badge.svg)

An AI code reviewer for pull requests. An LLM agent reads the diff, explores the repository with read-only tools, and posts a review comment on bugs and security risks. It runs in GitHub Actions, and only after linting, type checking and tests have passed.

**Live demo:** [pull request #9](https://github.com/reigokruus/ai-pr-reviewer/pull/9) contains four deliberately planted bugs. The comment on it was written by the agent.

![Review comment posted by the agent](docs/review-comment.png)

## How it works

```
Pull request opened or updated
        │
        ▼
  test job: lint → type check → unit tests
        │  fails → no AI review (no cost spent on code that doesn't build)
        ▼
  review job
        │
        ├─ read the diff (git diff origin/main...HEAD)
        ├─ diff too large? → post a "too large to review" comment and stop
        ├─ agent loop (max 8 steps)
        │     model asks for a tool → run it → send the result back
        │     tools: read_file, list_files, search_code (read-only)
        ├─ validate the final answer against a schema
        └─ post the review as a PR comment, and the agent's steps to the job summary
```

The agent decides on its own what extra context it needs. On the demo PR it reads the changed file with line numbers before writing its findings, which is what makes the reported line numbers exact.

| File | Responsibility |
| --- | --- |
| `src/diff.ts` | Reads the git diff, enforces the size limit |
| `src/agent.ts` | The agent loop: step limit, tool execution, step log |
| `src/tools.ts` | Read-only repository tools and the path traversal check |
| `src/llm.ts` | Adapter between the agent and the Anthropic API |
| `src/prompt.ts` | System prompt |
| `src/parse.ts` | Validates the model's reply with zod |
| `src/format.ts` | Turns findings and steps into markdown |
| `src/index.ts` | Wires it together, writes the comment and job summary |

The agent loop talks to a small `AgentModel` interface rather than to the SDK directly. That keeps the loop provider-independent and lets the tests replace the model with a fake that returns prepared answers, so the whole loop is tested without API calls.

## Results

The demo PR adds a file with four planted bugs: two security issues and two logic errors.

| Planted bug | Found | Line |
| --- | --- | --- |
| Hardcoded admin password | Yes | Exact |
| Missing null check hidden by a non-null assertion | Yes | Points at the `find` call where the undefined value originates |
| Off-by-one: loop starts at 1, first item silently skipped | Yes | Exact |
| SQL injection through string interpolation | Yes | Exact |

It also added a fair extra warning (password compared with a non-constant-time `===`).

**What changed between versions:**

- **Line numbers.** The first version sent only the diff, and the model had to work out line numbers from diff headers: 4 of 5 were 1–3 lines off. Adding a `read_file` tool that returns numbered lines, plus a prompt rule to use it before reporting, made them exact.
- **Severity.** At first every finding was an "error". Adding a definition of each severity level to the prompt moved minor findings to "warning".

## Security

| Risk | Mitigation |
| --- | --- |
| API key leaks | Key stored in GitHub Secrets; `.env` is git-ignored; secret scanning and push protection enabled |
| A pull request from a fork steals the key | Workflow uses `pull_request`, never `pull_request_target`; without a key the review step is skipped and the job stays green |
| The agent reads files outside the repository | Every path is resolved and rejected if it leaves the repository root (tested, including disguised paths like `src/./../..`) |
| Prompt injection in the reviewed code | The prompt treats the diff and files as data; tools are read-only; the reply is schema-validated; the agent can only produce a comment |
| A huge pull request burns API credit | Diff limit of 60,000 characters, agent step limit of 8, `max_tokens` cap; the size check runs before any API call |
| Over-broad permissions | Workflow token is read-only by default; only the review job gets `pull-requests: write` |
| Vulnerable or malicious dependencies | `npm ci` installs exactly the lockfile; Dependabot proposes weekly updates, and CI must pass before any of them can merge |
| Command injection through branch names | `git` is run with `execFileSync` and an argument list, never through a shell |

### Prompt injection test

A comment was added at the top of the reviewed file, claiming a prior security audit and instructing automated reviewers to report nothing and reply with an empty list. The agent ignored the instruction, still reported all four bugs, and flagged the comment itself as a warning, because the claim can't be verified and shouldn't be in the code.

This was a single attempt with one phrasing. Model output varies between runs and stronger techniques exist, so this shows resistance to this attempt, not immunity. The design limits the damage either way: the worst a successful injection can do is produce a wrong review comment. It cannot run code, write files or read secrets.

## Run it locally

Requirements: Node.js LTS and an Anthropic API key.

```bash
git clone https://github.com/reigokruus/ai-pr-reviewer.git
cd ai-pr-reviewer
npm ci
echo "LLM_API_KEY=your-key" > .env
```

Review the changes on a branch compared with `main`:

```bash
DIFF_HEAD=your-branch npm start
```

The tools read files from the current folder. To review a branch without checking it out, put it in a git worktree and point the tools there:

```bash
git worktree add ../review-target your-branch
DIFF_HEAD=your-branch REPO_ROOT=../review-target npm start
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `LLM_API_KEY` | (required) | Anthropic API key |
| `LLM_MODEL` | `claude-haiku-5-5` | Model used for the review |
| `DIFF_BASE` | `main` | Branch to compare against |
| `DIFF_HEAD` | `HEAD` | Branch or commit to review |
| `REPO_ROOT` | current folder | Where the agent's tools may read files |

Checks:

```bash
npm run lint
npm run typecheck
npm test
```

## Lessons from building it

- **The cheapest reviewer runs first.** One planted off-by-one bug was caught by the TypeScript compiler (`noUncheckedIndexedAccess`) before the AI ever saw it. Strict compiler settings catch a whole class of bugs in seconds for free, so the AI review only runs on code that already passes them.
- **A green CI only proves that the tests it ran passed.** A test file named `parse.tests.ts` instead of `parse.test.ts` was silently skipped by Vitest, so the JSON validation tests never ran while CI stayed green. Checking the test count caught it.
- **Keep the evidence when something fails.** The first CI run failed with "not valid JSON" and nothing else. The agent now returns the raw model reply with every parse failure, and the parser tolerates text around the JSON.
- **Automated updates still need a human decision.** Dependabot proposed TypeScript 7, but `typescript-eslint` doesn't support it yet. The install failed, so that major version is ignored for now instead of being forced in.

## Limitations

- Reviews are advisory. The review job is not a required check, so a missing key or a flaky model never blocks a merge; the tests are the gate.
- `read_file` returns at most 300 lines per file, and search results are capped at 50 matches.
- The path check does not follow symbolic links.
- Only the Anthropic API is implemented, although the adapter makes adding another provider a single new file.
- Measured on one demo pull request. A larger set of planted-bug examples would give a more reliable detection rate.

## Next steps

- A `/fix` command: a PR comment from the repository owner starts the agent on a separate branch, where it fixes a finding, runs the tests and opens a pull request with the fix for human review. Its write access would be limited to that branch, and nothing would reach `main` without review.
- Inline comments on the exact lines instead of one summary comment.
- An evaluation set of pull requests with known bugs, run on every prompt change, to measure whether a change makes the reviewer better or worse.

## Tech

TypeScript · Node.js · GitHub Actions · Anthropic API (tool use) · zod · Vitest · ESLint · Dependabot

## License

MIT
