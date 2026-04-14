# EPICS_AND_USER_STORIES.md

## Purpose

Actionable product-delivery backlog for the portfolio rebuild defined in:
- `docs/spec/PROJECT_SPEC.md`
- `ARCHITECTURE.md`

This document translates specification into epics and user stories that teams can execute in parallel.

## Product Summary

- Product type: personal portfolio website.
- Goal: replace legacy Gatsby + Contentful runtime with `Next.js App Router + Storyblok`.
- Delivery style: static-first, SEO-first, harness-first, deterministic CI gates.
- Design baseline: `designs/design-1-terminal-noir.html`.

## Available Inputs (current repo)

- Legacy content export:
  - `data/contentful-export/meta.json` (`17` entries, `18` assets, `4` content types, `1` locale).
  - `data/contentful-export/content_types.json`
  - `data/contentful-export/entries.json`
  - `data/contentful-export/assets.json`
- Hidden eval seed:
  - `data/evals/hidden-set-v1.json` (`7` baseline cases).
- Approved UI proposal:
  - `designs/design-1-terminal-noir.html`
- Bootstrap blueprint baseline:
  - `blueprints/blueprint-core-nextjs-ts` (TypeScript adaptation of Storyblok core Next.js blueprint).

## Target Technology Stack

- Frontend runtime: `Next.js` (App Router) + `TypeScript` strict.
- CMS: `Storyblok` (`@storyblok/react`, `storyblok-js-client`).
- Storyblok workspace tooling: `storyblok` CLI (`components`, `migrations`, `stories`, `assets`, `types`).
- Validation: `zod`.
- Testing:
  - Unit/Integration/Contract: `vitest`.
  - E2E: `@playwright/test`.
  - Exploratory tester-agent: `playwright-cli`.
- Quality gates: `eslint`, `tsc`, architecture boundary checks.
- CI/CD and hosting: `GitHub Actions` + `Vercel`.

## Epic Overview

| Epic ID | Name | Outcome |
| --- | --- | --- |
| `E1` | Runtime Foundation | Running Next.js App Router skeleton with architecture boundaries and core tooling |
| `E2` | Storyblok Model & Content Migration | Storyblok space ready with schema v1 and migrated baseline content |
| `E3` | Data Access, Mapping, Validation | Typed Storyblok client, mapping layer, Zod validation fail-closed behavior |
| `E4` | Portfolio UI & Routes | Home/project/writing routes implemented with approved terminal-noir design |
| `E5` | SEO & Discoverability | Metadata, JSON-LD, sitemap, robots, canonical correctness |
| `E6` | Preview, Webhook, Revalidation Security | Secure preview and on-demand revalidation with minimal invalidation scope |
| `E7` | Conformance, E2E, Tester-Agent | Full executable invariant coverage and bug-report artifacts |
| `E8` | CI/CD, Environments, Secrets | Deterministic CI gates and Vercel deployment with secure env wiring |
| `E9` | Launch Hardening | Performance budget, monitoring, final release readiness |

## User Stories by Epic

### E1 Runtime Foundation

| Story ID | User Story | Acceptance Criteria | Depends On | Parallel Group |
| --- | --- | --- | --- | --- |
| `E1-S1` | As a developer, I want Next.js App Router initialized in this repo from the local TS blueprint baseline, so that implementation can start in-place. | App boots locally from `blueprints/blueprint-core-nextjs-ts`; `app/` and `src/` structure matches `ARCHITECTURE.md`; no Gatsby runtime path exists; baseline `typecheck`, `lint`, and `build` pass. | - | `G-A` |
| `E1-S5` | As a product owner, I want the blueprint used as initial start-state, so that teams have a shared and deterministic starting shape of the app. | First working UI may reflect blueprint default structure/components only under explicit bootstrap waiver (owner + <=14-day expiry + exit criteria); backlog tasks explicitly evolve this baseline toward portfolio-specific modules and approved design system. | `E1-S1` | `G-A` |
| `E1-S2` | As a team lead, I want TypeScript strict + lint + formatting configured, so that quality is enforced from day 1. | `tsconfig` strict true; lint and typecheck scripts pass; baseline eslint config committed. | `E1-S1` | `G-A` |
| `E1-S3` | As an architect, I want dependency boundaries enforced, so that forbidden imports fail early. | Boundary rules match `ARCHITECTURE.md`; violation test/lint fails CI. | `E1-S1` | `G-B` |
| `E1-S4` | As QA, I want test framework scaffolding ready, so that conformance can be added incrementally. | Vitest + Playwright configured; placeholder suites runnable in CI. | `E1-S1` | `G-B` |

### E2 Storyblok Model & Content Migration

| Story ID | User Story | Acceptance Criteria | Depends On | Parallel Group |
| --- | --- | --- | --- | --- |
| `E2-S1` | As a content admin, I want Storyblok schema v1 created, so that content maps to defined contracts. | Components `page_home`, `page_project`, `page_writing`, `item_experience`, `item_social_link`, `seo_meta` exist with required fields and are managed through `storyblok components` / `storyblok migrations` workflow. | - | `G-A` |
| `E2-S2` | As migration engineer, I want legacy Contentful types mapped to Storyblok model, so that no key content is lost. | Mapping documented and validated on sample payloads: `about->home`, `project->page_project`, `experience/socialLink` reusable. | `E2-S1` | `G-A` |
| `E2-S3` | As editor, I want baseline content imported, so that portfolio has complete initial content. | Home + all projects + experience + social links populated from export; assets linked; manual QA sign-off. | `E2-S2` | `G-C` |
| `E2-S4` | As product owner, I want slug and SEO governance rules applied, so that publishing remains consistent. | Slug uniqueness checks and required SEO fields enforced by CMS configuration or publish checklist. | `E2-S1` | `G-C` |
| `E2-S5` | As developer, I want Storyblok types regenerated after schema changes, so that app code stays type-safe. | `storyblok types` is executed after schema changes and generated type artifacts are updated in repo. | `E2-S1` | `G-A` |
| `E2-S6` | As content admin, I want `page_writing` extended with provenance and editorial fields, so that blog/notes content can be credited and listed without a new content type. | Optional fields `updated_date`, `cover_image_alt`, `source_type`, `source_url`, `source_title`, `content_origin`, `language`, `reading_time_minutes`, and `featured` are in schema/type artifacts without invalidating existing writing stories. | `E2-S1`, `E2-S5` | `G-A` |
| `E2-S7` | As author, I want Markdown drafts imported into Storyblok richtext, so that local writing workflow feeds the CMS source of truth. | Import tooling defaults to dry-run, requires explicit publish credentials/flag for writes, validates frontmatter/provenance, rejects or sanitizes raw HTML, converts the approved CommonMark subset, and is never imported by runtime `src/*` code. | `E2-S6`, `E3-S2` | `G-B` |

### E3 Data Access, Mapping, Validation

| Story ID | User Story | Acceptance Criteria | Depends On | Parallel Group |
| --- | --- | --- | --- | --- |
| `E3-S1` | As developer, I want a typed Storyblok client abstraction, so that API usage is centralized. | `src/lib/storyblok/*` encapsulates client init, query helpers, and cache keys. | `E1-S1` | `G-B` |
| `E3-S2` | As developer, I want DTO-to-domain mappers, so that UI never consumes raw CMS payloads directly. | Mapping functions implemented for home/project/writing/experience/social/seo. | `E3-S1`, `E2-S1` | `G-B` |
| `E3-S3` | As reliability engineer, I want runtime Zod validation on every render payload, so that invalid content fails closed. | `INV-1` tests pass; invalid fixture returns controlled error/non-indexable fallback. | `E3-S2` | `G-B` |
| `E3-S4` | As platform engineer, I want deterministic listing query semantics, so that routing and ordering remain stable. | `starts_with`, `resolve_relations`, and deterministic sort consistently used in list queries. | `E3-S1` | `G-B` |

### E4 Portfolio UI & Routes

| Story ID | User Story | Acceptance Criteria | Depends On | Parallel Group |
| --- | --- | --- | --- | --- |
| `E4-S1` | As visitor, I want a terminal-noir home page, so that portfolio brand is clear and distinctive. | `/` implements approved design language from `design-1-terminal-noir.html`; content driven from Storyblok. | `E3-S2`, `E2-S3` | `G-C` |
| `E4-S2` | As visitor, I want project detail pages, so that I can inspect past work quickly. | `/projects/[slug]` routes render content and media; unknown slug returns 404 behavior per spec. | `E3-S2`, `E2-S3` | `G-C` |
| `E4-S3` | As visitor, I want writing detail pages, so that portfolio supports long-form content. | `/writing/[slug]` implemented with static/ISR policy and content rendering. | `E3-S2`, `E2-S1` | `G-C` |
| `E4-S4` | As product owner, I want route policy matrix enforced in code, so that no accidental dynamic rendering occurs. | Route configs align with matrix (`revalidate`, static params, dynamic exceptions only for allowed handlers). | `E4-S1`, `E4-S2`, `E4-S3` | `G-B` |
| `E4-S5` | As reader, I want writing detail richtext rendered semantically, so that long-form articles preserve headings, lists, quotes, links, inline code, code blocks, bold, and italic. | `/writing/[slug]` uses a server-safe Storyblok richtext renderer or narrow whitelist renderer, never unsafe raw HTML, and preserves terminal-noir long-form readability with accessible heading prefixes and focus-visible links. | `E4-S3`, `E2-S6` | `G-C` |
| `E4-S6` | As reader, I want a crawlable `/writing` index with pagination, so that I can discover older notes and summaries. | `/writing` and `/writing/page/[page]` list published `writing/*` stories server-side via dedicated `page_writing` query helper, `/writing/page/1` redirects to `/writing`, cards use terminal-noir design and crawlable pagination links. | `E4-S3`, `E3-S4`, `E2-S6` | `G-C` |

### E5 SEO & Discoverability

| Story ID | User Story | Acceptance Criteria | Depends On | Parallel Group |
| --- | --- | --- | --- | --- |
| `E5-S1` | As search user, I want unique metadata for every indexable page, so that snippets are accurate. | Title/description/canonical/OG present and unique for home + project + writing pages. | `E4-S1`, `E4-S2`, `E4-S3` | `G-B` |
| `E5-S2` | As search engine, I want sitemap and robots endpoints, so that crawl behavior is correct. | `/sitemap.xml` and `/robots.txt` implemented per route matrix and SEO policy. | `E4-S2`, `E4-S3` | `G-B` |
| `E5-S3` | As SEO owner, I want JSON-LD emitted consistently, so that structured data is machine-readable. | JSON-LD generated via central `src/lib/seo/*`; coverage for key templates. | `E5-S1` | `G-B` |
| `E5-S4` | As search user, I want writing index, pagination, and details to have deterministic metadata and sitemap coverage, so that blog/notes pages are discoverable. | `/writing`, `/writing/page/[page]`, and `/writing/[slug]` have central metadata/canonical behavior; sitemap includes `/writing` plus published details and only indexable paginated pages; detail JSON-LD includes modified date, image, tags/keywords, and article/blog posting data where available. | `E4-S5`, `E4-S6`, `E5-S3` | `G-B` |

### E6 Preview, Webhook, Revalidation Security

| Story ID | User Story | Acceptance Criteria | Depends On | Parallel Group |
| --- | --- | --- | --- | --- |
| `E6-S1` | As editor, I want secure preview mode for drafts, so that unpublished changes are reviewable safely. | `/api/preview` + `/api/exit-preview` validate secret and redirect safely; draft/published switching correct. | `E3-S1`, `E4-S1` | `G-B` |
| `E6-S2` | As platform, I want webhook-driven revalidation, so that published updates appear quickly without full rebuild. | `/api/revalidate/storyblok` validates secret, accepts allowed events, and revalidates minimal route scope. | `E3-S1`, `E4-S2` | `G-B` |
| `E6-S3` | As security owner, I want idempotent webhook handling and decision logging, so that duplicate/replayed events are safe. | Idempotency signature enforced; structured logs include accepted/rejected/ignored outcomes. | `E6-S2` | `G-B` |
| `E6-S4` | As platform, I want writing publish events to revalidate detail, index, pagination, and sitemap caches, so that listing pages do not stay stale after Storyblok changes. | `writing/*` publish, unpublish, and delete events revalidate the affected detail route, `/writing`, `/sitemap.xml`, and the `/writing/page/[page]` route pattern with integration coverage. | `E6-S2`, `E4-S6` | `G-B` |

### E7 Conformance, E2E, Tester-Agent

| Story ID | User Story | Acceptance Criteria | Depends On | Parallel Group |
| --- | --- | --- | --- | --- |
| `E7-S1` | As QA, I want invariant traceability artifact, so that every invariant has executable coverage. | `tests/conformance/invariant-traceability.json` maps `INV-*` and `INV-A*` to tests and reverse links; hidden-set cases declare invariant/test mappings. | `E1-S4` | `G-B` |
| `E7-S2` | As QA, I want unit/integration/contract/security suites, so that regressions are caught before merge. | Scripts `test:spec-consistency`, `test:unit`, `test:integration`, `test:contract`, `test:security` exist and pass on baseline. | `E3-S3`, `E5-S2`, `E6-S3` | `G-B` |
| `E7-S3` | As QA, I want E2E smoke coverage for critical flows, so that end-user behavior remains stable. | Playwright smoke flows cover `/`, valid/invalid project slug, writing slug, preview path. | `E4-S2`, `E6-S1` | `G-C` |
| `E7-S4` | As release manager, I want tester-agent artifacts on each change, so that exploratory findings are visible and enforceable. | `artifacts/tester-agent/*-report.md` generated; P0/P1 findings block merge. | `E7-S3` | `G-C` |
| `E7-S5` | As UI owner, I want visual parity checks against terminal-noir baseline, so that design drift is prevented. | `EVAL-007` checks `/`, `/projects/[slug]`, `/writing`, `/writing/page/[page]`, and `/writing/[slug]` snapshots/assertions against approved design baseline. | `E4-S1`, `E4-S2`, `E4-S6` | `G-C` |
| `E7-S6` | As platform owner, I want queue-driven ralph loop orchestration for locally fragmented markdown tickets, so that one agent can run after another inside Docker sandbox with deterministic verification. | Ticket files + matrix are generated from spec; queue is generated from active ticket statuses; sequential runner emits task brief/prompt/log artifacts; Docker wrapper is executable; failed verification marks item as failed in queue state. | `E7-S2`, `E8-S1` | `G-A` |
| `E7-S7` | As QA, I want blog/writing visual and normative evidence, so that the Markdown to Storyblok flow is shippable. | Normative gates pass; tester-agent and visual evidence cover `/writing` and a rich `/writing/[slug]` fixture with 800+ words, h2-h4, lists, blockquote, code, links, bold/italic, cover and no-cover states, and no open P0/P1 findings. | `E4-S5`, `E4-S6`, `E5-S4`, `E6-S4` | `G-C` |

### E8 CI/CD, Environments, Secrets

| Story ID | User Story | Acceptance Criteria | Depends On | Parallel Group |
| --- | --- | --- | --- | --- |
| `E8-S1` | As engineer, I want CI pipeline with mandatory gates, so that only conformant code can merge. | GitHub Actions runs `lint`, `typecheck`, `test:spec-consistency`, test suites, `test:harness`, and `tester-agent:run`; failures block PR merge. | `E7-S2`, `E7-S4` | `G-A` |
| `E8-S2` | As ops, I want Vercel environments connected, so that preview and production deploys are controlled. | Project is linked via `vercel` CLI; GitHub integration is connected; PR branches auto-deploy to Preview and `main` auto-deploys to Production. | `E1-S1` | `G-A` |
| `E8-S3` | As security owner, I want secrets wired in CI/CD securely, so that preview/webhook/auth data stays protected. | All required env vars set in Vercel/GitHub secrets; no secrets in repo; rotation runbook documented. | `E8-S1`, `E8-S2` | `G-A` |

### E9 Launch Hardening

| Story ID | User Story | Acceptance Criteria | Depends On | Parallel Group |
| --- | --- | --- | --- | --- |
| `E9-S1` | As user, I want fast portfolio pages, so that experience is smooth on mobile. | Performance SLOs hit: Lighthouse and CWV thresholds from `PROJECT_SPEC.md`. | `E4-S1`, `E5-S1` | `G-C` |
| `E9-S2` | As platform owner, I want security headers and basic monitoring, so that production risk is reduced. | Security headers configured; error logging and uptime checks in place. | `E8-S2` | `G-A` |
| `E9-S3` | As product owner, I want launch readiness sign-off, so that release is deterministic. | Final checklist complete: invariants covered, gates green, docs/changelog updated, rollback path documented. | `E9-S1`, `E9-S2` | `G-A` |

## Suggested Parallel Execution Plan

### Track A (Platform/DevOps)

- Start: `E1-S1`, `E1-S2`, `E8-S2`
- Then: `E1-S3`, `E1-S4`, `E8-S1`, `E8-S3`, `E9-S2`, `E9-S3`

### Track B (Backend/CMS/SEO)

- Start: `E2-S1`, `E3-S1`
- Then: `E2-S2`, `E3-S2`, `E3-S3`, `E3-S4`, `E2-S6`, `E2-S7`, `E6-S1`, `E6-S2`, `E6-S3`, `E6-S4`, `E5-S1`, `E5-S2`, `E5-S3`, `E5-S4`
- In parallel from early stage: `E7-S1`, then `E7-S2`

### Track C (Frontend/QA)

- Start after minimal data contracts: `E2-S3`, `E4-S1`
- Then: `E4-S2`, `E4-S3`, `E4-S4`, `E4-S5`, `E4-S6`, `E7-S3`, `E7-S5`, `E7-S7`, `E7-S4`, `E9-S1`

## Sprint-Level Cut (MVP recommendation)

- Sprint 1 (foundation): `E1-S1..S5`, `E2-S1`, `E2-S5`, `E3-S1`, `E8-S2`
- Sprint 2 (data + first route): `E2-S2..S4`, `E3-S2..S3`, `E4-S1`, `E5-S1`
- Sprint 3 (full routes + security): `E4-S2..S6`, `E6-S1..S4`, `E5-S2..S4`, `E2-S6..S7`
- Sprint 4 (quality gates): `E7-S1..S7`, `E8-S1`, `E8-S3`
- Sprint 5 (hardening + release): `E9-S1..S3`

## Definition Of Ready (for each story)

- Business value is explicit.
- Dependencies are known.
- Acceptance criteria are testable.
- Invariant links (`INV-*`/`INV-A*`) identified.
- Design/data inputs are available.

## Definition Of Done (for each story)

- Code complete and reviewed.
- Required tests added/updated, including regression guard when fixing bugs.
- CI gates pass.
- Tester-agent artifact generated for relevant UI/runtime changes.
- Spec/changelog updated when behavior or architecture contract changes.
