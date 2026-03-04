# Ralph Loop Task Contract

You are executing one queue item in the local sequential Ralph loop.

## Task Metadata

- Task ID: `{{TASK_ID}}`
- Type: `{{TASK_TYPE}}`
- Title: `{{TASK_TITLE}}`
- Required AGENTS ack token: `{{AGENTS_ACK_TOKEN}}`
- Queue file: `{{RALPH_QUEUE_FILE}}`
- Prompt template source: `{{RALPH_PROMPT_TEMPLATE_FILE}}`
- Task prompt artifact: `{{TASK_PROMPT_FILE}}`
- Task brief artifact: `{{TASK_BRIEF_FILE}}`
- Task JSON payload: `{{TASK_JSON_FILE}}`

## Canonical Prompt Root

Read `AGENTS.md` first and follow its precedence links.

Do not treat this prompt as a replacement for `AGENTS.md`; it is only task context.

## Goal

{{TASK_GOAL}}

## Scope

{{TASK_SCOPE_BULLETS}}

## Non-goals

{{TASK_NON_GOALS_BULLETS}}

## Invariants

{{TASK_INVARIANTS_BULLETS}}

## Acceptance Criteria

{{TASK_ACCEPTANCE_BULLETS}}

## Mandatory Execution Protocol

1. Update/maintain the task brief at `{{TASK_BRIEF_FILE}}` before major edits.
2. As first explicit action, confirm AGENTS load by printing exactly this line once: `{{AGENTS_ACK_TOKEN}}`.
3. Implement only what is required for this task and acceptance.
4. Keep changes deterministic and minimal.
5. After each edit batch, run `pnpm run cq` (Biome format + lint + typecheck).
6. Add/update regression or conformance coverage for changed behavior.
7. Do not mark complete if acceptance criteria or invariants are unmet.
8. Produce a concise completion summary with:
   - changed files
   - tests/commands run
   - residual risks or follow-up work
