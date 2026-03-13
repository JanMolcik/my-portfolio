# Launch Readiness Sign-Off

- Task: `E9-S3`
- Date: `2026-03-13`
- Owner: Product Owner
- Invariant focus: `INV-5`
- Runbook: `docs/ops/launch-readiness-signoff.md`

## Final Checklist

- [x] Invariants covered (`INV-5` traceability confirmed in `tests/conformance/invariant-traceability.json`).
- [x] Normative gates green (see gate checklist below).
- [x] Docs/changelog updated in this iteration.
- [x] Rollback path documented and executable.

## Normative Gate Checklist

- [x] `pnpm cq:check`
- [x] `pnpm test:spec-consistency`
- [x] `pnpm test:unit`
- [x] `pnpm test:integration`
- [x] `pnpm test:contract`
- [x] `pnpm test:security`
- [x] `pnpm test:e2e`
- [x] `pnpm test:harness`
- [x] `pnpm tester-agent:run`

## Docs/Changelog Delta

- [x] `docs/spec/CURRENT_TRUTH.md`
- [x] `docs/spec/SPEC_CHANGELOG.md`
- [x] `docs/ops/launch-readiness-signoff.md`
- [x] `tests/conformance/invariant-traceability.json`

## Verification Evidence

- Final local gate execution completed on `2026-03-13` with `pnpm cq:check`, `pnpm test:spec-consistency`, and `pnpm test:contract` re-verified after deployment-flow updates.
- Current production deploy is sourced from GitHub `main` via Vercel auto-deploy (`https://my-portfolio-teal-alpha-48.vercel.app`).
- Stable preview deploy is sourced from `codex/staging` via Vercel branch alias (`https://my-portfolio-git-codex-staging-janmolciks-projects.vercel.app`).
- Storyblok visual preview is configured to use the stable preview alias and publish revalidation is configured against the Vercel production alias.

## Rollback Path

Rollback trigger:
- Production `P0`/`P1` issue or failed post-release smoke route checks.

Rollback command:

```bash
vercel rollback <deployment-id-or-url>
```

Post-rollback verification:
1. Confirm the previous deployment is promoted in Vercel.
2. Re-run smoke checks on `/`, `/projects/[slug]`, `/writing/[slug]`.
3. Re-verify preview/webhook operational routes.
