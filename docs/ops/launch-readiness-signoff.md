# Launch Readiness Sign-Off Runbook

## Goal

Provide a deterministic, auditable release sign-off for `E9-S3` aligned to `INV-5`.

## Preconditions

1. Launch hardening dependencies are implemented (`E9-S1`, `E9-S2`).
2. Candidate branch is up to date with required docs and harness checks.
3. Required CI/CD secrets from `docs/ops/ci-cd-secrets-rotation.md` are present.

## Final Checklist

1. `INV-5` coverage is explicit in `tests/conformance/invariant-traceability.json`.
2. Normative gate manifest is green for the release candidate:

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

3. Docs/changelog are updated in the same iteration:
- `docs/spec/CURRENT_TRUTH.md`
- `docs/spec/SPEC_CHANGELOG.md`
- `artifacts/release/launch-readiness-signoff.md`
4. Rollback path is documented and executable (section below).

## Rollback Path

Rollback trigger examples:
- Any `P0`/`P1` issue in production after cutover.
- Any failed post-release smoke check on critical routes.
- Any broken preview/webhook operational behavior.

Rollback procedure:
1. Identify the last known good production deployment (`vercel ls` or dashboard).
2. Roll back immediately to the known good deployment:

```bash
vercel rollback <deployment-id-or-url>
```

3. Re-run the route smoke checks on `/`, `/projects/[slug]`, `/writing/[slug]`, and operational endpoints.
4. Record incident context and failed gate/evidence links in release notes before retrying.

## Evidence Artifact

Store the completed sign-off checklist at:

- `artifacts/release/launch-readiness-signoff.md`
