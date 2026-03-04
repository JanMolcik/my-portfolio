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

## Invariant Traceability Matrix (required)

| Invariant | Minimum required checks | Suggested test IDs |
| --- | --- | --- |
| `INV-1` Content Contract | Zod schema unit tests + Storyblok fixture contract tests | `UNIT-VAL-001`, `CONTRACT-SB-001` |
| `INV-2` Static-First | Route integration tests for static/ISR policy + no unexpected dynamic fallback | `INT-ROUTE-001`, `INT-ROUTE-002` |
| `INV-3` SEO Baseline | Metadata integration tests + sitemap/robots assertions | `INT-SEO-001`, `INT-SEO-002` |
| `INV-4` Revalidation Integrity | Webhook contract tests + targeted revalidation assertions | `CONTRACT-WEBHOOK-001`, `INT-REVAL-001` |
| `INV-5` Deterministic Delivery | Full gate pipeline + tester-agent artifact presence check | `HARNESS-CI-001`, `E2E-SMOKE-001` |
| `INV-6` Regression Guard | Policy check for bug-fix PRs requiring new or updated guard test | `HARNESS-POLICY-001` |
| `INV-A1` Architecture Static/ISR | Route policy conformance check against matrix in `PROJECT_SPEC.md` | `ARCH-ROUTE-001` |
| `INV-A2` Validated payload flow | Architecture/unit checks proving render path goes through validation layer | `ARCH-DATAFLOW-001` |
| `INV-A3` Centralized SEO generation | Import/conformance check for reusable SEO module usage | `ARCH-SEO-001` |
| `INV-A4` Critical module test coverage | Coverage/conformance check for critical module -> at least one conformance or contract test | `ARCH-COVERAGE-001` |

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
- It executes a scripted base journey, then allows exploratory actions.
- It saves snapshots/screenshots plus markdown report.
- It exits non-zero when blocking bugs are found.

Suggested command skeleton:

```bash
playwright-cli -s=tester open http://localhost:3000
playwright-cli -s=tester snapshot
# scripted deterministic steps + assertions via eval
playwright-cli -s=tester screenshot --filename=artifacts/tester-agent/home.png
playwright-cli -s=tester close
```

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
