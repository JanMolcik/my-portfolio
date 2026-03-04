# ARCHITECTURE.md

## Purpose

Defines structural constraints for the new portfolio repository (`Next.js App Router + Storyblok`) so humans and agents can refactor safely.

## Scope

- Module boundaries and dependency direction.
- Forbidden edges.
- Ownership and change protocol.

## System Decomposition

- `app/*`: Next.js App Router route segments, layouts, metadata, and route handlers.
- `src/features/*`: Feature modules (home, projects, writing, contact) with domain-oriented UI composition.
- `src/lib/storyblok/*`: Storyblok client, API wrappers, cache keys, and webhook revalidation helpers.
- `src/lib/seo/*`: metadata builders, schema.org emitters, robots/sitemap helpers.
- `src/lib/validation/*`: runtime schema validation (Zod) for Storyblok payloads.
- `src/components/*`: shared design-system components.
- `tests/*`: unit, integration, contract, conformance, and E2E tests.
- `scripts/*`: CI utilities, harness runner, tester-agent runner, ralph-loop runner, and reporting scripts.
- `docker/ralph-sandbox/*`: sandbox image for sequential queue-driven agent execution.
- `docs/spec/*`: canonical behavior and workflow contracts.

## Dependency Direction

1. `app/*` may depend on `src/features/*`, `src/components/*`, `src/lib/*`.
2. `src/features/*` may depend on `src/components/*` and `src/lib/*`.
3. `src/lib/storyblok/*` may depend on `src/lib/validation/*`.
4. `src/lib/seo/*` and `src/lib/validation/*` are leaf utility layers.
5. `tests/*` may import any runtime module.

## Forbidden Dependencies

- `src/lib/*` MUST NOT import from `app/*`.
- `src/lib/validation/*` MUST NOT import from UI layers (`app/*`, `src/features/*`, `src/components/*`).
- `src/components/*` MUST NOT import from `app/*`.
- `scripts/*` MUST NOT be imported by runtime code.

## Ownership

- Product architecture and spec: repo owner.
- `src/lib/storyblok/*` + content contracts: CMS owner.
- `src/lib/seo/*` + performance budgets: SEO/performance owner.
- `tests/*` + harness policies: tester-agent owner.

## Architecture Invariants

- `INV-A1`: Route rendering remains compatible with static generation and ISR; no accidental full-dynamic rendering.
- `INV-A2`: Storyblok payloads are validated before rendering.
- `INV-A3`: SEO metadata generation is centralized and reusable, not duplicated per route.
- `INV-A4`: Every critical module has at least one conformance or contract test.
- `INV-A5`: Agent loop orchestration remains queue-driven, sequential, anchored to canonical prompt source (`AGENTS.md`), and fed by local markdown ticket matrix/queue scripts.

## Enforcement

- ESLint boundaries (`no-restricted-imports`) for forbidden edges.
- TypeScript project references and strict mode.
- CI gate fails on structural lint violations.
- Architecture conformance test checks imports for forbidden edges.
- Harness conformance tests `HARNESS-RALPH-001` and `HARNESS-TICKETING-001` check ralph loop scripts/docker wiring and local ticket/matrix contract.

## Change Protocol

1. Propose architectural change with rationale and migration impact.
2. Update `ARCHITECTURE.md` in the same PR.
3. Update structural checks and affected conformance tests in the same PR.
4. Update `docs/spec/SPEC_CHANGELOG.md` if behavior/contract is affected.
