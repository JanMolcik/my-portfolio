# CURRENT_TRUTH.md

## Seventh-Pass Gatekeeper Enforcement (2026-03-04)

Maturity: M2
Confidence: High

Findings:
1. Normative gate stack from `HARNESS.md` is now executable end-to-end via repository scripts (`cq:check`, `test:*`, `tester-agent:run`).
2. Invariant traceability artifact is implemented at `tests/conformance/invariant-traceability.json`, including reverse `testId -> invariant` mapping and hidden-set linkage.
3. CI conformance workflow is wired at `.github/workflows/ci.yml` and mirrors the normative gate manifest command order.
4. `test:spec-consistency` now enforces gate-list alignment (`PROJECT_SPEC` vs `HARNESS`), script existence, traceability completeness, and hidden fixture resolution.
5. Local code-quality guard remains mandatory (`pnpm run cq`) and merge guard (`cq:check`) is active with Biome formatting in check mode.

Mode: Bootstrap

Planned edits:
1. Implement route-matrix remainder (`/sitemap.xml`, `/robots.txt`, `/api/preview`, `/api/exit-preview`, `/api/revalidate/storyblok`).
2. Replace blueprint generic content model with portfolio schema v1 mapping + runtime validation.
3. Expand tester-agent runner from bootstrap artifact mode to full deterministic scripted journey with explicit route assertions.
4. Add visual parity conformance checks for `/`, `/projects/[slug]`, `/writing/[slug]` against approved design baseline.

Verification plan:
1. Keep full normative gate sequence green after each implementation batch.
2. Extend `test:spec-consistency` rules as new invariants or artifacts are introduced.
3. Add regression guards for every bug fix per `INV-6` and enforce traceability updates in same iteration.
4. Validate CI and local gate commands remain order-consistent with `HARNESS.md` after any script change.

Remaining gaps:
1. Operational API routes and metadata routes from route policy matrix are still not implemented.
2. Runtime validation/mapping layer is still blueprint-shaped and not yet aligned to finalized Storyblok schema v1.
3. Visual parity checks are defined by contract but not yet implemented in executable test form.

## Sixth-Pass Route Decomposition (2026-03-04)

Maturity: M1
Confidence: High

Findings:
1. Bootstrap catch-all route was replaced by explicit App Router routes for `/`, `/projects/[slug]`, and `/writing/[slug]`.
2. Route-level static-first policy is now executable in code (`revalidate=3600`, `dynamic=force-static`) for implemented public templates.
3. Dynamic route scaffolding now includes published-content fetch, `generateStaticParams`, and 404/non-indexable metadata fallback behavior.
4. Shared Storyblok content fetch and SEO metadata helper layers were introduced under `src/lib/storyblok/*` and `src/lib/seo/*`.

Mode: Bootstrap

Planned edits:
1. Implement route matrix remainder (`/sitemap.xml`, `/robots.txt`, preview/exit-preview/revalidate handlers).
2. Replace blueprint generic block model with portfolio schema v1 mappers and validation.
3. Add conformance suite + `test:spec-consistency` and wire into CI gates.
4. Implement tester-agent runner and artifact enforcement.

Verification plan:
1. Keep `lint`, `typecheck`, and `build` green after each route/module change.
2. Add targeted route tests for `/`, `/projects/[slug]`, `/writing/[slug]` static policy and 404 behavior.
3. Validate metadata outputs against `INV-3` once portfolio SEO fields are mapped.
4. Confirm published-only content behavior until preview endpoints are introduced.

Remaining gaps:
1. `/sitemap.xml`, `/robots.txt`, and operational API routes are still missing.
2. Storyblok content model in code is still blueprint-shaped (page/grid/feature/teaser), not portfolio schema v1.
3. Conformance/tester-agent/CI enforcement stack remains unimplemented.

## Fifth-Pass Bootstrap Execution (2026-03-04)

Maturity: M1
Confidence: High

Findings:
1. Root repository is now bootstrapped with runnable `Next.js App Router` runtime from `blueprints/blueprint-core-nextjs-ts`.
2. Runtime build gates are green for baseline (`lint`, `typecheck`, `build`) with static catch-all baseline route policy.
3. Storyblok `Portfolio` space (`290927119725014`) is connected locally through environment wiring and verified API access.
4. Storyblok schema/story baseline artifacts are now pulled into repository (`data/storyblok/*`) and generated type artifact is available (`src/types/generated/storyblok-schema.d.ts`).
5. Canonical hardening constraints from fourth pass remain active; deterministic conformance and CI enforcement are still pending.

Mode: Bootstrap

Planned edits:
1. Replace blueprint generic blocks/routes with portfolio domain modules per `ARCHITECTURE.md`.
2. Implement conformance/test scripts including `test:spec-consistency`.
3. Implement preview/webhook handlers and security contract checks.
4. Wire GitHub Actions required checks to normative gate manifest.

Verification plan:
1. Keep baseline health green on every iteration (`lint`, `typecheck`, `build`).
2. Verify Storyblok schema pull + type generation after each schema change.
3. Add and enforce invariant traceability artifact and hidden-set fixture execution.
4. Execute tester-agent protocol after UI/runtime-impacting changes.

Remaining gaps:
1. Home story in target Storyblok space is currently unpublished (`published_at = null`), so published-only route returns fallback/404 until content is published.
2. No conformance suite, tester-agent runner script, or CI gate workflow is implemented yet.
3. Route policy matrix (`/projects/[slug]`, `/writing/[slug]`, SEO metadata routes, operational APIs) is not yet implemented beyond bootstrap catch-all baseline.

## Fourth-Pass Hardening Audit (2026-03-04)

Maturity: M1
Confidence: High

Findings:
1. Canonical docs are present and coherent, but multiple high-risk drift holes existed in enforcement details (bootstrap waiver boundaries, gate list divergence, and visual parity scope mismatch).
2. Deterministic delivery contract (`INV-5`) is now explicitly anchored to one normative gate manifest in `HARNESS.md`.
3. Design parity scope is now aligned with deployment rule across all critical templates (`/`, `/projects/[slug]`, `/writing/[slug]`).
4. Storyblok SEO field naming contract is now normalized to snake_case with explicit legacy alias handling rules.
5. Process-only policies now include artifact-level contracts (task brief and monthly 30-day test report).

Mode: Bootstrap

Planned edits:
1. Implement runtime and CI scripts for newly formalized `test:spec-consistency` gate.
2. Add invariant traceability artifact and hidden-set fixture files required by hardened spec.
3. Wire tester/loop runners to canonical prompt source and fail-fast behavior.
4. Execute bootstrap waiver only if needed, with explicit expiry and exit criteria.

Verification plan:
1. Validate no cross-doc divergence between `PROJECT_SPEC.md`, `HARNESS.md`, and `EPICS_AND_USER_STORIES.md`.
2. Ensure CI required checks mirror the normative gate manifest exactly.
3. Ensure hidden-set manifest references existing fixture files and explicit invariant/test mappings.
4. Ensure task-brief and 30-day artifact paths are generated and reviewable.

Remaining gaps:
1. Repository is still pre-runtime at root level; hardened contracts are ready but not yet executable.
2. CI workflows and protected branch rules remain to be implemented in GitHub/Vercel settings.
3. Tester-agent and conformance runners are specified but not yet implemented in `scripts/*`.

## Third-Pass Audit (2026-03-03)

Maturity: M1
Confidence: High

Findings:
1. Canonical configurancy artifacts now exist (`AGENTS.md`, `ARCHITECTURE.md`, `docs/spec/*`) and precedence is explicit.
2. Repository is currently spec-first bootstrap only (no Next.js runtime, no executable conformance suite, no CI gates yet).
3. Legacy source content was exported from Contentful (`17` entries, `18` assets, `4` content types) and is ready for Storyblok model mapping.
4. App Router route policy, preview/webhook security contract, Storyblok schema, hosting/secrets policy, and invariant traceability are now explicit in canonical docs.
5. Approved design source-of-truth is now fixed to `designs/design-1-terminal-noir.html` with required visual parity checks.

Mode: Bootstrap

Planned edits:
1. Bootstrap Next.js App Router runtime in this repository (in-place) and remove bootstrap-only state.
2. Implement Storyblok client + validation + mapping for finalized schema v1.
3. Implement conformance tests and CI gates defined in `HARNESS.md`.
4. Implement visual parity checks for approved design on critical templates.

Verification plan:
1. Verify canonical docs remain precedence-consistent after decision updates.
2. Run full gate sequence once runtime exists (`lint`, `typecheck`, unit/integration/contract/security/e2e/harness/tester-agent).
3. Validate hidden set baseline (`data/evals/hidden-set-v1.json`) in nightly harness run.
4. Validate visual parity checks against approved design on `/` and `/projects/[slug]`.

Remaining gaps:
1. Runtime bootstrap and implementation are not yet executed (current state remains spec-first).
2. CI workflows and secret wiring are not yet applied in repository settings.
3. Hidden set currently has v1 seed; real regression-derived cases will be appended as incidents occur.

## Active Decisions

- Migration strategy: greenfield rebuild in current repository (no Gatsby runtime carry-over).
- Frontend stack: Next.js App Router + TypeScript strict.
- CMS: Storyblok only.
- Test strategy: TDD-first + invariant-driven conformance.
- E2E strategy: Playwright + `playwright-cli` tester-agent exploratory pass per change.
- Current maturity target: `M1 -> M3` through executable conformance and CI enforcement.
- Design delivery strategy: implement and deploy UI from approved proposal in `designs/`.
- Approved design baseline: `designs/design-1-terminal-noir.html`.
- Hosting/deployment decision: `Vercel` + `GitHub Actions`, with setup via `vercel` CLI and GitHub auto-deployments (PR->Preview, `main`->Production).
- Repository strategy: bootstrap and implement in-place in this repository (no separate target repo required).
- Bootstrap implementation strategy: mandatory start from `blueprints/blueprint-core-nextjs-ts`; initial app shape may mirror blueprint before iterative portfolio-specific hardening.
- Bootstrap waiver policy: temporary blueprint carry-over requires owner, <=14-day expiry, and explicit exit criteria.
- Storyblok management strategy: use `storyblok` CLI as primary workflow for schema/content operations and type generation.
- Deterministic gate source-of-truth: `HARNESS.md` normative gate manifest is authoritative for `INV-5`.
- Code-quality guard strategy: `cq` must run after every edit batch (including Biome formatting), and `cq:check` is required for merge/CI verification.
- Package manager strategy: `pnpm` is the canonical package manager for local development, CI, and deployment workflows.

## Drift Rules

- If code/test behavior diverges from `PROJECT_SPEC.md`, fail CI and treat as defect.
- If architecture differs from `ARCHITECTURE.md`, update document and checks in same PR.
- If bug is fixed without regression guard, PR is incomplete.
