# SPEC_CHANGELOG.md

## 2026-03-16

- Extended `page_home` schema with optional `profile_image` so the Storyblok editor can manage the homepage portrait directly instead of relying on SEO media or local placeholders.
- Hardened `page_home` migration/import/push flow to preserve homepage profile media and seed it from the existing SEO OG image when upgrading older stories.
- Removed `page_home.roles` from the schema and homepage rendering because it only powered the `tech.json` tag strip and was blocking Storyblok publish in staging.

## 2026-03-13

- Added first-party contact intake contract with `/api/contact`, including Turnstile server-side verification, rate limiting, honeypot/timing bot traps, and Resend-backed delivery requirements.
- Expanded runtime env contract and CI/Vercel secret wiring requirements for secure contact-form operation.
- Updated CSP and route-policy documentation to allow Turnstile widget loading without weakening the static-first public route contract.
- Removed legacy `page_home.intro` from the Storyblok schema so the CMS only exposes the actual source-of-truth fields `hero_intro` and `about_intro`.

## 2026-03-12

- Extended `page_home` schema with CMS-managed `hero_intro`, `about_intro`, and availability copy fields so homepage positioning no longer depends on local runtime overrides.
- Extended `page_project` schema with CMS-managed `stack[]` so project cards and case studies render project-specific tags instead of misleading global skill badges.
- Extended `page_project` schema with CMS-managed `portfolio_priority` so homepage project ordering is deterministic and does not rely on relation reference order.
- Updated the baseline Storyblok import contract to apply a curated portfolio copy layer after legacy Contentful mapping, keeping publishable CMS content aligned with hiring-focused portfolio messaging.

## 2026-03-06

- Hardened Ralph loop with mandatory per-task visual guard execution before verify gates (`scripts/ralph-loop.mjs`), including enforced tester-agent env contract and dedicated visual log artifacts.
- Upgraded tester-agent runner to enforce-mode workflow with deterministic route probing, per-route screenshots, evidence JSON output, Playwright log-change verification, and blocking failure semantics when evidence is missing.
- Added harness contract assertions for visual-guard wiring and tester-agent enforce behavior (`HARNESS-RALPH-001`, `HARNESS-TESTER-AGENT-001`).
- Updated canonical spec docs (`PROJECT_SPEC.md`, `HARNESS.md`, `AGENT_ITERATION_PROTOCOL.md`, `CURRENT_TRUTH.md`) to formalize tester-agent evidence requirements and loop-level guard enforcement.
- Added `.playwright-cli/` to local ignore policy to prevent accidental git pollution from Playwright CLI runtime logs.

## 2026-03-05

- Added launch-readiness sign-off contract and evidence artifacts (`docs/ops/launch-readiness-signoff.md`, `artifacts/release/launch-readiness-signoff.md`) for `E9-S3`.
- Added harness guard `HARNESS-LAUNCH-001` and traceability wiring so deterministic release checklist coverage is executable under `INV-5`.
- Documented rollback command path (`vercel rollback <deployment-id-or-url>`) in the launch sign-off runbook.
- Added Ralph auto-commit identity contract for Docker runs (`RALPH_GIT_USER_NAME`, `RALPH_GIT_USER_EMAIL`) and fallback author/committer wiring in loop runtime.
- Added local sourceable Ralph env workflow (`.env.ralph.example`, `scripts/ralph-env.sh`, `ralph:env:*` package scripts) to avoid repetitive inline env setup.
- Added commit-message quality contract for Ralph loop auto-commits in `AGENT_ITERATION_PROTOCOL.md` (Conventional Commit subject + structured body with task/why/changes/validation).
- Upgraded Ralph loop auto-commit implementation to stage changes explicitly, infer descriptive commit type/scope/action from task+diff, and generate multi-paragraph commit messages.
- Added harness guard `HARNESS-COMMIT-001` and traceability wiring for `INV-A5` to prevent regression back to non-descriptive story-title commit messages.

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
- Separated native and Docker loop environments: Docker loop now defaults to isolated workspace mode with container-only `node_modules`/`.pnpm-store`, plus explicit `ralph:docker:loop:inplace` for direct repo writes when needed.
- Hardened Docker agent runtime for subscription mode: sandbox image now bundles `codex` and `claude` CLIs, Docker loop auto-mounts Claude session auth (`~/.claude`, `~/.claude.json`) by default with explicit override envs, container user now defaults to host UID:GID (non-root), and `inplace` vs `isolated` dependency-volume behavior is explicitly separated.
- Made `page_project.project_url` optional in Storyblok schema so archived or NDA-bound projects can render without fake live links, while homepage/detail CTA logic now falls back to `details` and/or `source` only.
- Fixed Storyblok editor drift for content-managed CV data: `roles`, `stack`, `skills`, and `tags` now use multi-select schema fields; snapshot contracts now validate schema-vs-story shape; and Storyblok datetime values are pushed in editor-friendly `YYYY-MM-DD HH:mm` format instead of opaque ISO strings.
