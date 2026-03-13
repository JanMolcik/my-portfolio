# AGENT_ITERATION_PROTOCOL.md

## Required Task Brief (before edits)

```md
Goal:
Scope:
Non-goals:
Invariants:
Acceptance:
```

Task-brief artifact contract:
- Path: `artifacts/task-briefs/<YYYYMMDD-HHMM>-<slug>.md`.
- Requirement: mandatory before implementation edits for any non-trivial change (feature, bug fix, refactor, contract update).
- Missing artifact is a policy failure under `INV-6`.

## Mandatory Execution Order

1. Reproduce (or define failing test first for new behavior).
2. Fix with minimal scope.
3. Run `CQ` (`pnpm run cq`) after each edit batch; this must include Biome formatting.
4. Guard with automated test and/or conformance scenario.
5. Verify full gate set.
6. Document contract delta if behavior changed.

## Loop Runner Prompt Source

- Loop/tester runners must read one canonical precedence source: `AGENTS.md`.
- `CLAUDE.md` exists only as compatibility shim and must reference `AGENTS.md`.
- Ralph loop task prompt must be rendered from `docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md` (override allowed via `RALPH_PROMPT_TEMPLATE_PATH`).
- Runners must fail fast if `AGENTS.md` or the prompt template file is missing.
- Runner scripts must not embed duplicated policy text that belongs in the template/spec files.

## Ralph Loop Contract (Spec Fragment -> Queue -> Docker)

- Queue source for agent execution is local markdown ticket decomposition.
  - Runtime path (default): `artifacts/ralph/task-queue.json`
  - Queue generation command: `pnpm tickets:queue`
- Queue execution is sequential (`one agent after another`) and queue-driven:
  - `pnpm ralph:once` processes exactly one pending item.
  - `pnpm ralph:loop` processes pending items in order.
- Each run must emit:
  - task brief artifact under `artifacts/task-briefs/`
  - per-item prompt/log/task payload artifacts under `artifacts/ralph/`
- Runner command contract:
  - `RALPH_AGENT_CMD_TEMPLATE` is mandatory.
  - Recommended command template for built-in engine switch:
    - `bash scripts/ralph-agent-runner.sh "{{TASK_PROMPT_FILE}}"`
  - `RALPH_ENGINE` controls engine for wrapper (`codex|claude`, default `codex`).
  - `RALPH_CODEX_ARGS` and `RALPH_CLAUDE_ARGS` allow engine-specific CLI flags.
  - `RALPH_PROMPT_TEMPLATE_PATH` defaults to `docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md`.
  - `RALPH_REQUIRE_AGENTS_ACK` defaults to `1`; if enabled, agent output must include per-task `AGENTS_ACK:<task-id>:<stamp>` token.
  - `RALPH_REQUIRE_VISUAL_GUARD` defaults to `1`; if enabled, every successful agent run must pass tester-agent visual guard before verify gates.
  - Visual guard environment defaults:
    - `TESTER_AGENT_ENFORCE=1`
    - `TESTER_AGENT_URL=${TESTER_AGENT_URL:-http://127.0.0.1:3000}`
    - `TESTER_AGENT_REQUIRED_PATHS` inferred from changed files (fallback `/`)
    - `TESTER_AGENT_REQUIRE_PLAYWRIGHT_LOG_CHANGE=1`
    - `TESTER_AGENT_PLAYWRIGHT_LOG_DIR=${RALPH_PLAYWRIGHT_LOG_DIR:-.playwright-cli}`
  - Template placeholders: `{{TASK_ID}}`, `{{TASK_TITLE}}`, `{{TASK_PROMPT_FILE}}`, `{{TASK_BRIEF_FILE}}`, `{{TASK_JSON_FILE}}`.
  - Prompt placeholders available in `RALPH_TASK_PROMPT_TEMPLATE.md`:
    - `{{TASK_ID}}`, `{{TASK_TYPE}}`, `{{TASK_TITLE}}`, `{{TASK_GOAL}}`
    - `{{TASK_SCOPE_BULLETS}}`, `{{TASK_NON_GOALS_BULLETS}}`, `{{TASK_INVARIANTS_BULLETS}}`, `{{TASK_ACCEPTANCE_BULLETS}}`
    - `{{TASK_PROMPT_FILE}}`, `{{TASK_BRIEF_FILE}}`, `{{TASK_JSON_FILE}}`, `{{RALPH_QUEUE_FILE}}`, `{{RALPH_PROMPT_TEMPLATE_FILE}}`, `{{AGENTS_ACK_TOKEN}}`
  - Verification command defaults to deterministic gate subset, override via `RALPH_VERIFY_CMD`.

### Commit Message Contract (Ralph Auto-Commit)

Ralph-generated commits must follow a deterministic, descriptive format aligned with established guidance:
- [Git project submitting guidelines](https://git-scm.com/docs/SubmittingPatches)
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [How to Write a Git Commit Message](https://cbea.ms/git-commit/)

Contract:
- Subject format: `<type>(<scope>): <imperative summary> (<TASK_ID>)`
- Allowed `type`: `feat|fix|docs|test|chore`
- `scope` must reflect primary changed area (`app`, `storyblok`, `harness`, `ralph`, `docs`, `tickets`, ...)
- Subject must be concise (`<=72` chars), imperative, and MUST NOT copy raw user-story prose (`As a ... I want ...`)
- Body is required and must include:
  - `Task: <TASK_ID>`
  - `Goal: <single-line goal>`
  - `Why: <outcome>` when available
  - `Changes:` bullet list of touched files
  - `Validation:` executed verify command/gates
- Ralph loop must stage with `git add -A` and commit with separate subject/body paragraphs.
- If commit contract cannot be satisfied (or commit fails), task status remains `failed`.
- Docker sandbox execution:
  - Build image: `pnpm ralph:docker:build`
  - Run loop in isolated container workspace (default): `pnpm ralph:docker:loop`
  - Run loop directly against current repository workspace: `pnpm ralph:docker:loop:inplace`
  - Docker wrapper fails fast on missing queue file or missing `RALPH_AGENT_CMD_TEMPLATE`.
  - Docker image must include both `codex` and `claude` CLIs for deterministic engine switching.
  - `RALPH_DOCKER_MODE=isolated` is default and keeps native/dev workspace separate from container dependency writes.
  - `RALPH_DOCKER_SANDBOX_ROOT` defaults to `/tmp/my-portfolio-ralph-workspaces` to avoid polluting repository tree with full sandbox copies.
  - `RALPH_DOCKER_USER` controls container execution user (default host UID:GID; set explicitly when required).
  - In `inplace` mode, container `node_modules` and `.pnpm-store` are mounted as anonymous volumes to avoid host pollution.
  - In `isolated` mode, dependencies are installed inside isolated workspace copy under `RALPH_DOCKER_SANDBOX_ROOT`.
  - `RALPH_DOCKER_SYNC_BACK=1` can be used to copy isolated workspace changes back to repository root (disabled by default).
  - `RALPH_DOCKER_SHARE_CLAUDE_AUTH=1` (default) mounts host Claude subscription session into container (`~/.claude`, `~/.claude.json`) when `RALPH_ENGINE=claude`; missing auth paths must fail fast.
  - `RALPH_DOCKER_CLAUDE_DIR` and `RALPH_DOCKER_CLAUDE_STATE_FILE` allow explicit auth path override for Claude subscription mode.
  - `RALPH_DOCKER_SHARE_CODEX_AUTH=1` optionally mounts host Codex home into container (`RALPH_DOCKER_CODEX_HOME`, default `${CODEX_HOME:-~/.codex}`).
  - Example local shortcuts:
    - `pnpm ralph:once:codex`
    - `pnpm ralph:once:claude`
    - `pnpm ralph:loop:codex`
    - `pnpm ralph:loop:claude`

## Local Markdown Ticket Contract

- Canonical ticket storage:
  - `tickets/epics/*.md`
  - `tickets/user-stories/*.md`
  - `tickets/bugs/*.md`
- Matrix overview:
  - `tickets/MATRIX.md` is generated by `pnpm tickets:sync`.
- Fragmentation contract:
  - `pnpm tickets:fragment` decomposes canonical spec backlog into ticket files (create-if-missing behavior).
- Queue contract:
  - `pnpm tickets:queue` transforms active ticket statuses into `artifacts/ralph/task-queue.json`.
  - `TICKETS_QUEUE_STATUSES` controls which ticket statuses enter queue (default: `ready,in_progress`).
- Drift guard:
  - `test:spec-consistency` must fail if this section exists but required scripts/templates/matrix files are missing.

## TDD Policy

- New behavior starts with failing test (`red -> green -> refactor`).
- Bug fix without regression test is forbidden.
- Core modules (`src/lib/storyblok`, `src/lib/seo`, route metadata) require unit + integration tests.

## Verify Gates (must pass before merge)

1. Code-quality guard check (`cq:check`) before merge.
2. Spec consistency checks (`test:spec-consistency`).
3. Targeted invariant tests for touched modules.
4. Type/static checks (`tsc`, `eslint`, architecture boundary checks).
5. Conformance suite (contract fixtures, route rendering checks, SEO checks).
6. E2E suite (Playwright test).
7. Tester-agent exploratory run using `playwright-cli` + markdown bug report artifact.

## Tester-Agent Protocol (per change)

Input:
- PR diff summary.
- Expected affected routes/components.
- Critical invariants to probe.

Run:
1. Start app in production-like mode.
2. Execute deterministic smoke flows (`/`, `/projects/[slug]`, `/writing/[slug]`, 404, preview when applicable).
3. Execute exploratory pass with `playwright-cli snapshot/click/fill/eval` focusing on navigation, content integrity, and SEO-visible elements.
4. Capture screenshots and console/network anomalies when found.

Output artifact:
- `artifacts/tester-agent/<timestamp>-report.md`
- `artifacts/tester-agent/<timestamp>-evidence.json`
- `artifacts/tester-agent/<timestamp>-<route>.png` for each required route
- Required sections: `Scope`, `Steps`, `Findings`, `Severity`, `Reproduction`, `Suggested guard test`.

Merge rule:
- Any open P0/P1 finding blocks merge.
- Missing/unchanged Playwright CLI logs in enforce mode blocks merge (guard treated as not executed).

## Failure Taxonomy

- `REQ`: spec ambiguity or missing rule.
- `CTX`: missing context for agent execution.
- `CODE`: implementation defect.

Every failure must be tagged and routed to corrective action in spec/code/tests.
