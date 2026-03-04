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

- Loop/tester runners must read one canonical prompt source: `AGENTS.md`.
- Runners must fail fast if canonical prompt source file is missing.
- Runner scripts must not embed duplicated policy text.

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
- Required sections: `Scope`, `Steps`, `Findings`, `Severity`, `Reproduction`, `Suggested guard test`.

Merge rule:
- Any open P0/P1 finding blocks merge.

## Failure Taxonomy

- `REQ`: spec ambiguity or missing rule.
- `CTX`: missing context for agent execution.
- `CODE`: implementation defect.

Every failure must be tagged and routed to corrective action in spec/code/tests.
