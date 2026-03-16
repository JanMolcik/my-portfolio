# PROJECT_SPEC.md

## Project

Greenfield replacement of legacy Gatsby + Contentful portfolio with a new repository based on `Next.js App Router + Storyblok`.

## Objectives

- Drop legacy architecture and rebuild from scratch (retain only reusable content/assets where valuable).
- Achieve excellent performance (static-first rendering, aggressive caching, minimal JS).
- Achieve strong technical SEO baseline (metadata, sitemap, robots, structured data, canonical URLs).
- Use harness-first engineering so agent-driven changes are deterministic and test-enforced.
- Run a tester-agent loop after every change using `playwright-cli` for manual E2E exploration + bug reporting.
- Enable queue-driven ralph loop execution for fragmented local markdown tickets (epics, user stories, bug reports) in Docker sandbox mode.

## Non-Goals

- Incremental in-place migration of Gatsby runtime.
- Preserving old component hierarchy.
- Supporting multiple CMS providers in v1.

## External Oracles

1. Storyblok official docs for Next.js App Router integration, visual editing bridge, routing, and draft/published delivery.
2. Next.js official App Router docs for static rendering, ISR, metadata, and route caching.
3. Configurancy model (ElectricSQL article, 2026-02-02) for explicit `affordances/invariants/constraints/rationale`.
4. Harness engineering (OpenAI article) for eval-first loop and drift detection.
5. Storyblok official blueprint baseline: `https://github.com/storyblok/blueprint-core-nextjs` (adapted locally to TypeScript).
6. Cloudflare Turnstile official docs for client widget constraints and server-side token verification.
7. Resend official docs for transactional email delivery.
8. Upstash official docs for distributed serverless rate limiting.

## Core Affordances

- Editor can manage all portfolio content in Storyblok (hero, projects, writing, about, SEO fields).
- Preview mode shows draft content immediately.
- Published pages are static or ISR-cached and globally cacheable.
- Content updates trigger on-demand revalidation through secure webhook endpoint.
- Build/test/deploy pipeline blocks releases if conformance gates fail.
- Frontend UI is deployed according to an approved design proposal stored in `designs/`.

## Constraints

- Next.js App Router only.
- TypeScript strict mode enabled.
- Runtime content validation is mandatory.
- No route may silently degrade to fully dynamic rendering without explicit architectural exception.
- Tester-agent run is mandatory for every code change before merge.
- Tester-agent enforce mode must produce evidence artifacts (`*-report.md`, `*-evidence.json`, per-route screenshots) and prove fresh Playwright log activity.
- Fragmented local markdown tickets must be consumable via queue manifest for sequential ralph loop execution (`one agent after another`).
- Local ticket scripts must support fragmentation (`spec -> tickets`), matrix sync, and queue generation workflow.
- Dynamic rendering exceptions are limited to operational route handlers (`/api/preview`, `/api/exit-preview`, `/api/revalidate/storyblok`).
- Dynamic rendering exceptions are limited to operational route handlers (`/api/preview`, `/api/exit-preview`, `/api/revalidate/storyblok`, `/api/contact`).
- One design proposal from `designs/*.html` must be selected as source-of-truth before UI implementation starts.
- Production pages must preserve approved visual direction (layout, typography, color system, motion) unless a new proposal is approved in `designs/`.
- Runtime bootstrap must start from `blueprints/blueprint-core-nextjs-ts` as the mandatory baseline template.
- Bootstrap temporary carry-over from blueprint is allowed only under a time-boxed waiver recorded in `CURRENT_TRUTH.md` with owner, expiry date, and explicit exit criteria.
- Creating a fresh app from scratch (`create-next-app`) is not the default path; deviation requires explicit rationale in PR notes.
- Storyblok space operations (schema, migrations, stories, assets, language settings, type generation) must be executed via `storyblok` CLI.
- `version=draft` content fetch is forbidden outside preview routes; this rule applies from day 1, including bootstrap starter state.

## Bootstrap Blueprint Adoption Contract

- Source bootstrap baseline for implementation is `blueprints/blueprint-core-nextjs-ts`.
- This blueprint defines the approved starting point for:
  - initial route wiring,
  - Storyblok provider/client integration,
  - baseline block rendering and project structure.
- The first runnable app version may keep the blueprint's initial structure/look as a temporary start state.
- Subsequent iterations must evolve that baseline to portfolio-specific architecture and approved visual identity (`designs/design-1-terminal-noir.html`) while preserving all invariants.
- Any replacement of blueprint baseline files must keep behavior-compatible bootstrap capability and be covered by regression checks.
- Bootstrap waiver cannot override `INV-*` invariants; non-preview routes must remain published-content only.
- Each waiver must expire in <=14 calendar days from activation date; extensions require explicit decision update in `CURRENT_TRUTH.md` and `SPEC_CHANGELOG.md`.

## Invariants

- `INV-1` Content Contract: Every Storyblok payload rendered by app must pass Zod schema validation.
- `INV-2` Static-First: All public routes must be static or ISR; dynamic rendering requires explicit whitelisted exception.
- `INV-3` SEO Baseline: Every indexable route has unique title, description, canonical URL, OG tags, and JSON-LD when applicable.
- `INV-4` Revalidation Integrity: Storyblok publish webhook invalidates exactly affected route groups.
- `INV-5` Deterministic Delivery: CI passes only when the normative gate set from `HARNESS.md` passes (`cq:check`, `test:spec-consistency`, `test:unit`, `test:integration`, `test:contract`, `test:security`, `test:e2e`, `test:harness`, `tester-agent:run`).
- `INV-6` Regression Guard: Every bug fix adds a reproducible test or harness scenario.

## Approved Design Source-Of-Truth

- Approved proposal: `designs/design-1-terminal-noir.html`.
- Effective date: `2026-03-03`.
- Deployment rule: route templates (`/`, `/projects/[slug]`, `/writing/[slug]`) must preserve this proposal's typography hierarchy, color system, spacing rhythm, and interaction language.
- Change rule: replacing this design requires a new committed proposal file in `designs/` plus `PROJECT_SPEC.md` + `SPEC_CHANGELOG.md` update in the same PR.

## Reference Model

- Define typed Storyblok DTOs + mapping functions from Storyblok JSON to internal domain view models.
- Define route-level render policies:
  - Static by default (`generateStaticParams` when applicable).
  - ISR via `revalidate` for content that changes frequently.
  - `draft` content only in preview mode.
- Define cache key map:
  - `storyblok:page:{slug}`
  - `storyblok:list:projects`
  - `storyblok:list:writing`

## Route Policy Matrix (App Router)

| Route | Source | Rendering policy | Cache policy | Notes |
| --- | --- | --- | --- | --- |
| `/` | Story `home` singleton | Static + ISR | `revalidate=3600` | Must satisfy `INV-2`, `INV-3` |
| `/projects/[slug]` | Stories under `projects/*` | Pre-render with `generateStaticParams` + ISR for new slugs | `revalidate=3600` | Unknown slug must return `404` + non-indexable metadata |
| `/writing/[slug]` | Stories under `writing/*` | Pre-render with `generateStaticParams` + ISR for new slugs | `revalidate=3600` | Unknown slug must return `404` + non-indexable metadata |
| `/sitemap.xml` | Derived from Storyblok links index | Static metadata route | `revalidate=86400` | Must include only indexable routes |
| `/robots.txt` | Static policy + sitemap URL | Static metadata route | `revalidate=86400` | Must disallow preview and operational paths |
| `/api/preview` | Storyblok Visual Editor preview action | Dynamic route handler (allowed exception) | `no-store` | Enables `draftMode` only after secret validation |
| `/api/exit-preview` | Internal preview toggle | Dynamic route handler (allowed exception) | `no-store` | Disables `draftMode` |
| `/api/revalidate/storyblok` | Storyblok publish webhook | Dynamic route handler (allowed exception) | `no-store` | Verifies secret and revalidates only affected route groups |
| `/api/contact` | First-party contact intake | Dynamic route handler (allowed exception) | `no-store` | Verifies Turnstile token server-side, rate limits by client IP, and relays mail through Resend |

## Preview and Webhook Security Contract

- Preview enable endpoint must validate shared secret in constant time; invalid secret returns `401`.
- Preview endpoint must only redirect to safe internal paths (no open redirect); invalid slug/path returns `400`.
- Preview mode must fetch Storyblok with `version=draft`; non-preview mode must use `version=published`.
- Webhook endpoint must validate shared secret before processing any payload.
- Webhook handler accepts only publish/unpublish/delete events and ignores unsupported event types.
- Webhook handler must be idempotent by event signature (`story_id + event_type + published_at`).
- Revalidation scope must be minimal: affected story route and dependent listing routes only.
- All preview/webhook invocations must emit structured logs with decision (`accepted`, `rejected`, `ignored`).

## Contact Intake Security Contract

- `/api/contact` must remain a first-party endpoint on the portfolio domain; embedded third-party form redirects are not the primary path.
- Every contact submission must pass Zod validation before any verification or delivery side effect.
- Every contact submission must pass Cloudflare Turnstile server-side verification; client-side token presence alone is insufficient.
- Contact intake must enforce per-IP rate limiting before email delivery.
- Contact intake must include at least one low-cost bot trap in addition to Turnstile (`honeypot` and/or minimum submit delay).
- Contact intake must fail closed when protection is unavailable in production.
- Contact messages must be delivered through Resend or an equivalent server-side provider; client-direct email sending is forbidden.
- Contact messages must not use Storyblok as storage and must not require durable database persistence in v1.

## Storyblok Content Model Contract

- Story structure:
- `home` singleton story (`/`) with sections for hero copy, about copy, tech stack tags, social links, projects, and experience.
  - `projects/*` folder for project detail stories.
  - `writing/*` folder for writing detail stories.
- Required fields for indexable stories:
  - `slug` (unique per folder scope).
  - `title` and `description` (used by metadata fallback).
  - `seo` object/block (`meta_title`, `meta_description`, `canonical_url`, `og_image`).
- Naming policy: snake_case field names are canonical for Storyblok schema and generated types; migration aliases (`metaTitle`, `metaDescription`, `canonical`, `ogImage`) are legacy-only and must be normalized in mapping layer tests.
- Relation policy:
  - `home` references `projects` and `experience` by UUID relations.
  - Listing queries must use deterministic sort (`published_at:desc` or explicit order field).
  - API queries must explicitly declare `resolve_relations` and `starts_with`.
- Runtime contract:
  - Every fetched story payload is validated by Zod (`INV-1`) before render.
  - Any schema mismatch fails closed (error boundary + non-indexable fallback where applicable).
- Legacy migration baseline (Contentful export `2026-03-03T20:26:35.593Z`):
  - Content types: `about`, `project`, `experience`, `socialLink`.
  - Counts: `17` entries, `18` assets, `1` locale.
  - Mapping: `about -> home`, `project -> projects/*`, `experience -> reusable relation records`, `socialLink -> reusable relation records`.

### Storyblok Schema (finalized v1)

- `page_home` (singleton):
  - `headline` (text, required), `role` (text, required)
  - `hero_intro` (richtext, required), `about_intro` (richtext, required)
  - `profile_image` (asset image, optional)
  - `tech_stack` (plugin tag list, optional; freeform string tags)
  - `social_links` (blok list -> `item_social_link`, required)
  - `availability_note` (textarea, required), `availability_status` (text, required)
  - `availability_timezone` (text, required), `availability_response_time` (text, required)
  - `featured_projects` (stories -> `page_project`, required), `experience` (stories -> `item_experience`, required)
  - `seo` (blok -> `seo_meta`, required)
- `page_project`:
  - `title` (text, required), `slug` (text, required; unique by workflow under `projects/*`)
  - `summary` (textarea, required), `content` (richtext, optional)
  - `published_date` (datetime, required), `project_url` (url, optional), `repository_url` (url, optional)
  - `type` (text, required), `portfolio_priority` (number, optional for deterministic homepage ordering)
  - `stack` (multi-option, optional), `logo` (asset image, optional), `seo` (blok -> `seo_meta`, required)
- `page_writing`:
  - `title` (text, required), `slug` (text, required; unique by workflow under `writing/*`)
  - `excerpt` (textarea, required), `content` (richtext, required), `published_date` (datetime, required)
  - `cover_image` (asset image, optional), `tags` (multi-option, optional), `seo` (blok -> `seo_meta`, required)
- `item_experience`:
  - `title` (text, required), `company_name` (text, required)
  - `description` (richtext, required), `start_date` (date, required), `end_date` (date, optional)
  - `skills` (multi-option, required), `image` (asset image, optional)
  - stored as relationable Storyblok stories under `experience/*`
- `item_social_link`:
  - `name` (text, required), `url` (url, required), `icon` (text, required)
- `seo_meta` (reusable block):
  - `meta_title` (text, required), `meta_description` (textarea, required)
  - `canonical_url` (url, optional), `og_image` (asset image, optional), `noindex` (boolean, default false)

### Storyblok Operational Workflow (CLI-first)

- CLI authentication and workspace setup:
  - `storyblok login`
- Schema and content model management:
  - `storyblok components ...`
  - `storyblok migrations ...`
  - `storyblok languages ...`
  - `storyblok datasources ...`
- Content and assets operations:
  - `storyblok stories ...`
  - `storyblok assets ...`
- Type synchronization:
  - `storyblok types ...` must be used after schema changes to refresh local type artifacts.
- Manual UI edits in Storyblok are allowed, but any structural changes (components/fields/migrations) must be reflected through CLI-managed workflow in the same iteration.

## Hosting and Secrets Contract

- Hosting target: `Vercel` (production + preview environments).
- CI target: `GitHub Actions` with required gate sequence from `HARNESS.md`.
- Required runtime env vars:
  - `NEXT_PUBLIC_SITE_URL`
  - `STORYBLOK_ACCESS_TOKEN` (published content)
- `STORYBLOK_PREVIEW_TOKEN` (draft content, server-side only)
- `PREVIEW_SECRET`
- `STORYBLOK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL`
- `CONTACT_TO_EMAIL`
- `UPSTASH_REDIS_REST_URL` (optional, recommended for distributed production rate limiting)
- `UPSTASH_REDIS_REST_TOKEN` (optional, recommended for distributed production rate limiting)
- Secret management rules:
  - Secrets must be stored only in GitHub/Vercel secret stores (never committed).
  - Preview and webhook secrets must be rotated at least every 90 days.
  - Rotation requires same-day verification run of `test:security`, `test:harness`, and tester-agent report.
- Deployment policy:
  - Production deploy is blocked unless all mandatory gates pass.
  - Preview deploys may proceed for feature branches but must run at minimum `lint`, `typecheck`, and route smoke E2E.
  - Vercel project bootstrap and repository linking must be performed via `vercel` CLI (`vercel login`, `vercel link`).
  - GitHub repository integration in Vercel is mandatory with automatic deployments enabled.
  - Auto-deployment routing is fixed:
    - Pull request branches -> Vercel Preview deployments.
    - `main` branch -> Vercel Production deployment.
  - Required GitHub checks must pass before merge to `main` so production auto-deploy can proceed safely.

## Conformance Suite Requirements

- Unit tests for mapping and validation (`INV-1`, `INV-6`).
- Integration tests for route rendering and metadata generation (`INV-2`, `INV-3`).
- Contract tests against recorded Storyblok payload fixtures (`INV-1`, `INV-4`).
- Security tests for preview and webhook authorization, fail-closed behavior, and idempotency (`INV-4`, `INV-5`).
- E2E tests for critical user journeys (`INV-2`, `INV-3`, `INV-5`).
- Tester-agent exploratory run using `playwright-cli`, with markdown bug report, evidence JSON, and per-route screenshots (`INV-5`).
- Ralph loop runner scripts and Docker wrapper must stay executable for queue-driven story execution.
- Invariant traceability artifact is mandatory (`INV-* -> test IDs` and inverse mapping), missing links fail CI.
- Visual parity checks (snapshot or targeted DOM/style assertions) against approved `designs/` proposal are required for critical templates (`/`, `/projects/[slug]`, `/writing/[slug]`).
- `test:spec-consistency` is mandatory and must fail on precedence mismatch, missing traceability artifact, missing hidden-set fixtures, or unresolved invariant/test references.
- `CQ` guard is mandatory after each edit batch and must include Biome formatting; merge/CI must run `cq:check`.

## Repository Bootstrap (in-place)

```bash
# run in repository root
cd /path/to/my-portfolio

# bootstrap from local TypeScript-adapted Storyblok blueprint baseline
rsync -a blueprints/blueprint-core-nextjs-ts/ ./

# install dependencies
pnpm install

# verify baseline bootstrap health
pnpm run typecheck
pnpm run lint
pnpm run build

# add project-specific testing and architecture tooling
pnpm add -D @playwright/test vitest @vitest/coverage-v8 eslint-plugin-boundaries
pnpm exec playwright install

# setup Storyblok CLI (interactive)
storyblok login

# setup Vercel project link (interactive)
vercel login
vercel link
```

## Delivery Phases

1. Phase A: Foundation
- Initialize repo, CI, strict TypeScript, lint/format, dependency boundaries.
- Install canonical docs from `docs/spec/*` + `AGENTS.md` + `ARCHITECTURE.md`.
- Bootstrap runtime by adopting `blueprints/blueprint-core-nextjs-ts` with minimal divergence in first iteration.

2. Phase B: CMS Contract
- Model Storyblok content types and sample content.
- Manage Storyblok schema/migrations with `storyblok` CLI as source-of-truth workflow.
- Implement Storyblok client wrappers, Zod schemas, and mapping layer.
- Generate/update local Storyblok types via `storyblok types` after schema updates.
- Add preview mode + webhook revalidation endpoint.

3. Phase C: Route Implementation
- Build App Router pages with static-first policy.
- Implement metadata API, robots, sitemap, and JSON-LD.
- Implement image handling and font strategy for CWV.
- Implement UI according to the approved proposal in `designs/` and document any intentional deviations.
- Replace temporary blueprint starter UI/blocks with portfolio-specific feature modules while preserving Storyblok integration stability.

4. Phase D: Harness & E2E
- Create eval dataset (A+ visible + hidden set).
- Implement conformance suite and tester-agent runner.
- Gate CI on conformance + tester-agent report.

5. Phase E: Launch Hardening
- Performance budget enforcement (Lighthouse/Web Vitals).
- Security headers + error budgets.
- Final migration and archive of old repo.

## Performance and SEO SLOs

- Lighthouse (mobile, production): Performance >= 95, SEO >= 100, Accessibility >= 95, Best Practices >= 95.
- CWV targets: LCP < 2.0s, CLS < 0.05, INP < 200ms on primary template.
- JS payload: route-level budget with CI warnings and fail threshold.
- Cache policy:
  - HTML via ISR with explicit `revalidate` windows.
  - Asset caching with immutable hashes.
  - Storyblok webhook -> on-demand route revalidation.

## Acceptance Criteria (Definition of Done)

- Current repository is bootstrapped and running as `Next.js App Router + Storyblok`.
- Bootstrap origin is traceable to `blueprints/blueprint-core-nextjs-ts` and documented as foundation for subsequent iterations.
- Legacy Gatsby runtime is not part of runtime path; only selectively migrated assets/content remain.
- All invariants mapped to executable checks.
- CI includes deterministic gates and blocks merges on drift.
- Tester-agent runs after each change and publishes reproducible bug report artifacts.
- Approved design proposal from `designs/` is implemented on production routes, with deviations recorded in PR notes and covered by regression checks.
