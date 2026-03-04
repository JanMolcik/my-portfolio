# SPEC_CHANGELOG.md

## 2026-03-03

- Initialized canonical configurancy/spec stack for greenfield migration to `Next.js App Router + Storyblok`.
- Added architecture constraints, invariants, harness, and tester-agent protocol.
- Declared migration mode as `Bootstrap (M0 -> target M3)`.
- Updated audit status to `M1` with explicit note that repository is currently spec-first bootstrap.
- Added App Router route policy matrix with explicit dynamic exceptions for preview and webhook handlers.
- Added enforceable preview/webhook security contract and Storyblok content model contract.
- Added required invariant traceability matrix and mandatory artifact path for `Doc <-> Code` drift gates.
- Added design deployment rule: production UI must follow an approved proposal from `designs/`, with visual parity verification in harness.
- Finalized Storyblok schema v1, hosting/secrets contract, and approved design source-of-truth (`design-1-terminal-noir`).
- Added hidden eval baseline dataset manifest at `data/evals/hidden-set-v1.json`.
- Updated audit to third pass and replaced strategic gaps with execution-only gaps.

## 2026-03-04

- Added local bootstrap baseline `blueprints/blueprint-core-nextjs-ts` derived from `storyblok/blueprint-core-nextjs` and adapted to TypeScript.
- Added explicit deployment contract for setup via `vercel` CLI and mandatory GitHub auto-deployments (PR->Preview, `main`->Production).
- Added explicit bootstrap adoption contract: app initialization must start from `blueprints/blueprint-core-nextjs-ts`, using it as initial shape and iterating toward portfolio-specific implementation.
- Added Storyblok CLI-first management contract for schema/migrations/content operations and post-schema type generation.
- Hardened bootstrap policy with time-boxed waiver requirements and explicit non-preview draft-fetch prohibition from day 1.
- Unified deterministic delivery contract (`INV-5`) to one normative gate manifest in `HARNESS.md`, including mandatory `test:spec-consistency`.
- Expanded visual parity enforcement (`EVAL-007`) to include `/writing/[slug]` in addition to `/` and `/projects/[slug]`.
- Normalized Storyblok SEO field naming contract to canonical snake_case and documented legacy alias normalization expectations.
- Added artifact-level process enforcement for task briefs and monthly 30-day test reports.
- Executed in-repo bootstrap from `blueprints/blueprint-core-nextjs-ts` into repository root (`package.json`, `src/*`, Next/TS/eslint configs), preserving canonical spec docs.
- Added Storyblok environment contract implementation in runtime code (`published` default fetch, static bootstrap route policy, token variable fallback to canonical env names).
- Connected local development to Storyblok space `Portfolio` (`290927119725014`) and added pulled schema/story baseline artifacts under `data/storyblok/`.
- Added generated Storyblok type artifact at `src/types/generated/storyblok-schema.d.ts` for schema-aware iteration.
- Replaced bootstrap catch-all route with explicit public routes (`/`, `/projects/[slug]`, `/writing/[slug]`) and shared Storyblok/SEO helper layers aligned to static-first route policy.
- Added mandatory `CQ` guard policy: after each edit batch run `cq` (includes Biome formatting), and require `cq:check` in merge/CI gate flow.
- Migrated repository package-manager contract from `npm` to `pnpm` (`packageManager` field, `pnpm-lock.yaml`, and updated workflow commands/scripts).
- Added executable gatekeeper layer for normative harness manifest: `test:spec-consistency`, unit/integration/contract/security/harness suites, Playwright smoke E2E, and tester-agent runner script.
- Added required invariant traceability artifact at `tests/conformance/invariant-traceability.json` with bidirectional invariant/test mapping.
- Added CI workflow `.github/workflows/ci.yml` that runs normative gates in authoritative manifest order from `HARNESS.md`.
- Added bootstrap tester-agent report artifact generation at `artifacts/tester-agent/*-report.md` with required report sections and blocking severity exit behavior.
- Added queue-driven ralph loop execution contract for locally fragmented markdown tickets (`pnpm ralph:once`, `pnpm ralph:loop`) with per-item task brief/prompt/log artifacts.
- Added Docker sandbox enablement for sequential ralph runs (`docker/ralph-sandbox/Dockerfile`, `scripts/ralph-docker-loop.sh`, `pnpm ralph:docker:*` scripts).
- Added architecture invariant `INV-A5` for ralph loop behavior and harness guard `HARNESS-RALPH-001`.
- Extended `test:spec-consistency` to enforce ralph loop contract drift checks when protocol section is declared.
- Added local markdown ticket system (`tickets/*`) with templates for epics, user stories, and bugs plus generated matrix overview (`tickets/MATRIX.md`).
- Added spec fragmentation + matrix/queue tooling scripts (`spec-fragmenter`, `tickets-sync`, `tickets-to-queue`) and package workflow commands (`tickets:*`).
- Added harness guard `HARNESS-TICKETING-001` and extended traceability for `INV-A5` to include local ticketing wiring checks.
- Added dedicated ralph task prompt contract file (`docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md`) with placeholder schema, fail-fast template resolution in loop runner, and harness/spec-consistency drift enforcement.
- Simplified ralph prompt root to `AGENTS.md` (no duplicate canonical source list in prompt body), added strict `AGENTS_ACK` output enforcement in loop runner, and introduced `CLAUDE.md` compatibility shim that delegates to `AGENTS.md`.
- Added engine wrapper `scripts/ralph-agent-runner.sh` with `RALPH_ENGINE=codex|claude` switch, plus ready-to-run pnpm shortcuts (`ralph:*:codex`, `ralph:*:claude`) and Docker env passthrough for consistent ACK-aware execution.
