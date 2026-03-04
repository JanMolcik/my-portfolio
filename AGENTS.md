# AGENTS.md

This file is a table of contents for canonical, enforceable project docs.
Do not duplicate policy text here.

## Precedence

1. [`docs/spec/PROJECT_SPEC.md`](docs/spec/PROJECT_SPEC.md)
2. [`docs/spec/CURRENT_TRUTH.md`](docs/spec/CURRENT_TRUTH.md)
3. Code and conformance tests
4. Historical logs and archived notes

If any layer disagrees with a higher layer, treat it as drift and fail CI.

## Canonical Documents

- Product and behavior contract: [`docs/spec/PROJECT_SPEC.md`](docs/spec/PROJECT_SPEC.md)
- Active decisions and maturity status: [`docs/spec/CURRENT_TRUTH.md`](docs/spec/CURRENT_TRUTH.md)
- Delivery backlog (epics and user stories): [`docs/spec/EPICS_AND_USER_STORIES.md`](docs/spec/EPICS_AND_USER_STORIES.md)
- Bootstrap reference baseline: [`blueprints/blueprint-core-nextjs-ts/README.md`](blueprints/blueprint-core-nextjs-ts/README.md)
- Iteration and bug-fix protocol: [`docs/spec/AGENT_ITERATION_PROTOCOL.md`](docs/spec/AGENT_ITERATION_PROTOCOL.md)
- Harness and evaluation policy: [`docs/spec/HARNESS.md`](docs/spec/HARNESS.md)
- Behavior/spec contract changelog: [`docs/spec/SPEC_CHANGELOG.md`](docs/spec/SPEC_CHANGELOG.md)
- Architecture constraints: [`ARCHITECTURE.md`](ARCHITECTURE.md)

## Execution Notes

- Any architecture change must update `ARCHITECTURE.md` and structural checks in the same PR.
- Any behavior contract change must update `PROJECT_SPEC.md`, conformance tests, and `SPEC_CHANGELOG.md` in the same PR.
- Every bug fix must add or update a regression guard test.
