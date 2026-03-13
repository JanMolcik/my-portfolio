# HARNESS.md

## Goal

Install a deterministic harness loop that catches drift between specification, implementation, and agent behavior.

## Harness Layers

1. External oracle: official Next.js and Storyblok behavior.
2. Reference model: typed content mapping + rendering policy.
3. Conformance suite: executable tests and structural checks.
4. Prose rationale: docs explaining why constraints exist.

## Eval Sets

### A+ Visible Set (runs on every PR)

- `EVAL-001`: Home route renders published Storyblok content and passes metadata assertions.
- `EVAL-002`: Project detail route for valid slug is static/ISR and has canonical/OG metadata.
- `EVAL-003`: Invalid slug resolves to 404 with non-indexable metadata.
- `EVAL-004`: Storyblok webhook triggers revalidation of changed route.
- `EVAL-005`: Preview mode shows draft content only with authorized token.
- `EVAL-006`: Sitemap and robots endpoints include expected routes and directives.
- `EVAL-007`: Critical templates (`/`, `/projects/[slug]`, `/writing/[slug]`) satisfy visual parity checks against approved proposal in `designs/`.

### Hidden Set (nightly)

- Real regression-derived fixtures: malformed rich text, missing asset fields, extreme text lengths, unexpected locale payloads.
- Baseline dataset manifest: `data/evals/hidden-set-v1.json`.
- Promotion rule: every reproduced production regression must be appended to hidden set in the same bug-fix PR.
- Every hidden-set case must declare `invariants` and `testIds`.
- Every `fixture` path declared in hidden set must exist in repository; missing fixture path fails `test:spec-consistency`.

## Conformance Patterns

- Deterministic scenario tests for route and metadata invariants.
- Contract tests for Storyblok schema compatibility.
- Differential checks for draft vs published payload behavior.
- Visual regression checks against approved design baseline assets.
- Exploratory tester-agent run for unknown unknowns.
- Queue-driven ralph loop checks for sequential local-ticket execution in sandbox mode.

## Invariant Traceability Matrix (required)

| Invariant | Minimum required checks | Suggested test IDs |
| --- | --- | --- |
| `INV-1` Content Contract | Zod schema unit tests + Storyblok fixture contract tests | `UNIT-VAL-001`, `CONTRACT-SB-001` |
| `INV-2` Static-First | Route integration tests for static/ISR policy + no unexpected dynamic fallback | `INT-ROUTE-001`, `INT-ROUTE-002` |
| `INV-3` SEO Baseline | Metadata integration tests + sitemap/robots assertions | `INT-SEO-001`, `INT-SEO-002` |
| `INV-4` Revalidation Integrity | Webhook contract tests + targeted revalidation assertions | `CONTRACT-WEBHOOK-001`, `INT-REVAL-001` |
| `INV-5` Deterministic Delivery | Full gate pipeline + tester-agent artifact presence check | `HARNESS-CI-001`, `E2E-SMOKE-001` |
| `INV-6` Regression Guard | Policy check for bug-fix PRs requiring new or updated guard test | `HARNESS-POLICY-001`, `SEC-CONTACT-001` |
| `INV-A1` Architecture Static/ISR | Route policy conformance check against matrix in `PROJECT_SPEC.md` | `ARCH-ROUTE-001` |
| `INV-A2` Validated payload flow | Architecture/unit checks proving render path goes through validation layer | `ARCH-DATAFLOW-001` |
| `INV-A3` Centralized SEO generation | Import/conformance check for reusable SEO module usage | `ARCH-SEO-001` |
| `INV-A4` Critical module test coverage | Coverage/conformance check for critical module -> at least one conformance or contract test | `ARCH-COVERAGE-001` |
| `INV-A5` Ralph/ticket loop architecture | Harness checks for queue-driven sequential runner, Docker wrapper, local ticket/matrix wiring, and deterministic auto-commit contract | `HARNESS-RALPH-001`, `HARNESS-TICKETING-001`, `HARNESS-COMMIT-001` |

- `Doc -> Code` gate: every invariant in docs must appear in the traceability artifact.
- `Code -> Doc` gate: every critical conformance test must reference at least one invariant.
- Required artifact path: `tests/conformance/invariant-traceability.json`.

## Normative Gate Manifest (authoritative for `INV-5`)

```bash
pnpm cq:check
pnpm test:spec-consistency
pnpm test:unit
pnpm test:integration
pnpm test:contract
pnpm test:security
pnpm test:e2e
pnpm test:harness
pnpm tester-agent:run
```

- `INV-5` in `PROJECT_SPEC.md` must mirror this exact gate list.
- Local iteration guard: run `pnpm run cq` after each edit batch (includes Biome formatting with write mode).

## Tester-Agent Implementation Contract

- Runner script starts a browser session via `playwright-cli`.
- In enforce mode (`TESTER_AGENT_ENFORCE=1`) it must fail if `TESTER_AGENT_URL` is not explicit.
- It executes deterministic checks for every route listed in `TESTER_AGENT_REQUIRED_PATHS` (default `/`).
- It saves per-route screenshots, markdown report, and evidence JSON (`*-evidence.json` with log metrics and findings).
- It verifies that Playwright logs advanced in `TESTER_AGENT_PLAYWRIGHT_LOG_DIR` (default `.playwright-cli`) when enforce mode is active.
- It exits non-zero when blocking bugs are found (`P0`/`P1`) or visual verification evidence is missing.

Suggested command skeleton:

```bash
playwright-cli -s=tester open http://localhost:3000
playwright-cli -s=tester snapshot
# scripted deterministic steps + assertions via eval
playwright-cli -s=tester screenshot --filename=artifacts/tester-agent/home.png
playwright-cli -s=tester close
```

## Ralph Loop Contract (enablement)

- Queue source is generated from local markdown tickets:
  - runtime: `artifacts/ralph/task-queue.json`
  - generator: `scripts/tickets-to-queue.mjs`
- Runner scripts:
  - `scripts/ralph-loop.mjs`
  - `scripts/ralph-docker-loop.sh`
  - `scripts/ralph-agent-runner.sh`
  - `docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md`
- Docker sandbox image definition:
  - `docker/ralph-sandbox/Dockerfile`
- Loop behavior:
  - process pending queue item(s) sequentially
  - generate per-item task brief/prompt/log artifacts
  - enforce AGENTS-read acknowledgement token in agent output (strict by default)
  - enforce visual guard after each successful agent execution (`tester-agent:run` with `TESTER_AGENT_ENFORCE=1`) before verification gates
  - run verification command after each agent execution
  - generate descriptive structured commit messages for auto-commits (not raw story-title copy)
  - persist status transitions (`pending` -> `in_progress` -> `done|failed`) in queue JSON
  - Docker wrapper defaults to isolated workspace mode to separate container dependency writes from native environment
  - Docker image bundles both supported CLIs (`codex`, `claude`) and Claude subscription auth mount is enforced by default when `RALPH_ENGINE=claude`

## Local Ticketing Contract (recommended)

- Fragment stage: `scripts/spec-fragmenter.mjs` creates epic/user-story ticket files from canonical spec backlog (without overwriting edited tickets).
- Sync stage: `scripts/tickets-sync.mjs` builds matrix overview at `tickets/MATRIX.md`.
- Queue stage: `scripts/tickets-to-queue.mjs` maps active ticket statuses into queue manifest.
- Suggested operator flow:
  1. `pnpm tickets:build`
  2. `pnpm ralph:once` or `pnpm ralph:loop`
  3. `pnpm tickets:sync`

## Drift Gates

- `Doc -> Code`: each invariant ID maps to at least one automated test.
- `Code -> Doc`: each critical test references at least one invariant ID.
- `Spec -> Harness`: gate IDs/commands referenced by spec must resolve to executable scripts and artifacts.
- Missing mapping fails CI.

## 30-Day Test

Monthly, answer behavior questions from docs + tests only (without reading implementation code). Any ambiguous answer becomes a spec or conformance task.

Artifact contract:
- Path: `artifacts/30-day-test/YYYY-MM-report.md`.
- Required sections: `Questions`, `Answers`, `Evidence`, `Ambiguities`, `Actions`.
- Missing monthly artifact is treated as process drift.
