# Ticket Matrix

Generated at: 2026-03-05T09:24:23.682Z

| ID | Type | Title | Status | Priority | Owner | Depends On | Invariants | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | epic | Runtime Foundation | backlog | P1 | unassigned | - | INV-5 | [E1.md](./epics/E1.md) |
| E1-S1 | user_story | As a developer, I want Next.js App Router initialized in this repo from the local TS blueprint baseline, so that implementation can start in-place. | done | P1 | unassigned | - | INV-5 | [E1-S1.md](./user-stories/E1-S1.md) |
| E1-S2 | user_story | As a team lead, I want TypeScript strict + lint + formatting configured, so that quality is enforced from day 1. | done | P1 | unassigned | E1-S1 | INV-5 | [E1-S2.md](./user-stories/E1-S2.md) |
| E1-S3 | user_story | As an architect, I want dependency boundaries enforced, so that forbidden imports fail early. | done | P1 | unassigned | E1-S1 | INV-5 | [E1-S3.md](./user-stories/E1-S3.md) |
| E1-S4 | user_story | As QA, I want test framework scaffolding ready, so that conformance can be added incrementally. | done | P1 | unassigned | E1-S1 | INV-5 | [E1-S4.md](./user-stories/E1-S4.md) |
| E1-S5 | user_story | As a product owner, I want the blueprint used as initial start-state, so that teams have a shared and deterministic starting shape of the app. | done | P1 | unassigned | E1-S1 | INV-5 | [E1-S5.md](./user-stories/E1-S5.md) |
| E2 | epic | Storyblok Model & Content Migration | backlog | P1 | unassigned | - | INV-5 | [E2.md](./epics/E2.md) |
| E2-S1 | user_story | As a content admin, I want Storyblok schema v1 created, so that content maps to defined contracts. | ready | P1 | unassigned | - | INV-5 | [E2-S1.md](./user-stories/E2-S1.md) |
| E2-S2 | user_story | As migration engineer, I want legacy Contentful types mapped to Storyblok model, so that no key content is lost. | ready | P1 | unassigned | E2-S1 | INV-5 | [E2-S2.md](./user-stories/E2-S2.md) |
| E2-S3 | user_story | As editor, I want baseline content imported, so that portfolio has complete initial content. | ready | P1 | unassigned | E2-S2 | INV-5 | [E2-S3.md](./user-stories/E2-S3.md) |
| E2-S4 | user_story | As product owner, I want slug and SEO governance rules applied, so that publishing remains consistent. | ready | P1 | unassigned | E2-S1 | INV-5 | [E2-S4.md](./user-stories/E2-S4.md) |
| E2-S5 | user_story | As developer, I want Storyblok types regenerated after schema changes, so that app code stays type-safe. | ready | P1 | unassigned | E2-S1 | INV-5 | [E2-S5.md](./user-stories/E2-S5.md) |
| E3 | epic | Data Access, Mapping, Validation | backlog | P1 | unassigned | - | INV-5 | [E3.md](./epics/E3.md) |
| E3-S1 | user_story | As developer, I want a typed Storyblok client abstraction, so that API usage is centralized. | ready | P1 | unassigned | E1-S1 | INV-5 | [E3-S1.md](./user-stories/E3-S1.md) |
| E3-S2 | user_story | As developer, I want DTO-to-domain mappers, so that UI never consumes raw CMS payloads directly. | ready | P1 | unassigned | E3-S1`, `E2-S1 | INV-5 | [E3-S2.md](./user-stories/E3-S2.md) |
| E3-S3 | user_story | As reliability engineer, I want runtime Zod validation on every render payload, so that invalid content fails closed. | ready | P1 | unassigned | E3-S2 | INV-1 | [E3-S3.md](./user-stories/E3-S3.md) |
| E3-S4 | user_story | As platform engineer, I want deterministic listing query semantics, so that routing and ordering remain stable. | ready | P1 | unassigned | E3-S1 | INV-5 | [E3-S4.md](./user-stories/E3-S4.md) |
| E4 | epic | Portfolio UI & Routes | backlog | P1 | unassigned | - | INV-5 | [E4.md](./epics/E4.md) |
| E4-S1 | user_story | As visitor, I want a terminal-noir home page, so that portfolio brand is clear and distinctive. | ready | P1 | unassigned | E3-S2`, `E2-S3 | INV-5 | [E4-S1.md](./user-stories/E4-S1.md) |
| E4-S2 | user_story | As visitor, I want project detail pages, so that I can inspect past work quickly. | ready | P1 | unassigned | E3-S2`, `E2-S3 | INV-5 | [E4-S2.md](./user-stories/E4-S2.md) |
| E4-S3 | user_story | As visitor, I want writing detail pages, so that portfolio supports long-form content. | ready | P1 | unassigned | E3-S2`, `E2-S1 | INV-5 | [E4-S3.md](./user-stories/E4-S3.md) |
| E4-S4 | user_story | As product owner, I want route policy matrix enforced in code, so that no accidental dynamic rendering occurs. | ready | P1 | unassigned | E4-S1`, `E4-S2`, `E4-S3 | INV-5 | [E4-S4.md](./user-stories/E4-S4.md) |
| E5 | epic | SEO & Discoverability | backlog | P1 | unassigned | - | INV-5 | [E5.md](./epics/E5.md) |
| E5-S1 | user_story | As search user, I want unique metadata for every indexable page, so that snippets are accurate. | ready | P1 | unassigned | E4-S1`, `E4-S2`, `E4-S3 | INV-5 | [E5-S1.md](./user-stories/E5-S1.md) |
| E5-S2 | user_story | As search engine, I want sitemap and robots endpoints, so that crawl behavior is correct. | ready | P1 | unassigned | E4-S2`, `E4-S3 | INV-5 | [E5-S2.md](./user-stories/E5-S2.md) |
| E5-S3 | user_story | As SEO owner, I want JSON-LD emitted consistently, so that structured data is machine-readable. | ready | P1 | unassigned | E5-S1 | INV-5 | [E5-S3.md](./user-stories/E5-S3.md) |
| E6 | epic | Preview, Webhook, Revalidation Security | backlog | P1 | unassigned | - | INV-5 | [E6.md](./epics/E6.md) |
| E6-S1 | user_story | As editor, I want secure preview mode for drafts, so that unpublished changes are reviewable safely. | ready | P1 | unassigned | E3-S1`, `E4-S1 | INV-5 | [E6-S1.md](./user-stories/E6-S1.md) |
| E6-S2 | user_story | As platform, I want webhook-driven revalidation, so that published updates appear quickly without full rebuild. | ready | P1 | unassigned | E3-S1`, `E4-S2 | INV-5 | [E6-S2.md](./user-stories/E6-S2.md) |
| E6-S3 | user_story | As security owner, I want idempotent webhook handling and decision logging, so that duplicate/replayed events are safe. | ready | P1 | unassigned | E6-S2 | INV-5 | [E6-S3.md](./user-stories/E6-S3.md) |
| E7 | epic | Conformance, E2E, Tester-Agent | backlog | P1 | unassigned | - | INV-5 | [E7.md](./epics/E7.md) |
| E7-S1 | user_story | As QA, I want invariant traceability artifact, so that every invariant has executable coverage. | ready | P1 | unassigned | E1-S4 | INV-5 | [E7-S1.md](./user-stories/E7-S1.md) |
| E7-S2 | user_story | As QA, I want unit/integration/contract/security suites, so that regressions are caught before merge. | ready | P1 | unassigned | E3-S3`, `E5-S2`, `E6-S3 | INV-5 | [E7-S2.md](./user-stories/E7-S2.md) |
| E7-S3 | user_story | As QA, I want E2E smoke coverage for critical flows, so that end-user behavior remains stable. | ready | P1 | unassigned | E4-S2`, `E6-S1 | INV-5 | [E7-S3.md](./user-stories/E7-S3.md) |
| E7-S4 | user_story | As release manager, I want tester-agent artifacts on each change, so that exploratory findings are visible and enforceable. | ready | P1 | unassigned | E7-S3 | INV-5 | [E7-S4.md](./user-stories/E7-S4.md) |
| E7-S5 | user_story | As UI owner, I want visual parity checks against terminal-noir baseline, so that design drift is prevented. | ready | P1 | unassigned | E4-S1`, `E4-S2 | INV-5 | [E7-S5.md](./user-stories/E7-S5.md) |
| E7-S6 | user_story | As platform owner, I want queue-driven ralph loop orchestration for locally fragmented markdown tickets, so that one agent can run after another inside Docker sandbox with deterministic verification. | ready | P1 | unassigned | E7-S2`, `E8-S1 | INV-5 | [E7-S6.md](./user-stories/E7-S6.md) |
| E8 | epic | CI/CD, Environments, Secrets | backlog | P1 | unassigned | - | INV-5 | [E8.md](./epics/E8.md) |
| E8-S1 | user_story | As engineer, I want CI pipeline with mandatory gates, so that only conformant code can merge. | ready | P1 | unassigned | E7-S2`, `E7-S4 | INV-5 | [E8-S1.md](./user-stories/E8-S1.md) |
| E8-S2 | user_story | As ops, I want Vercel environments connected, so that preview and production deploys are controlled. | ready | P1 | unassigned | E1-S1 | INV-5 | [E8-S2.md](./user-stories/E8-S2.md) |
| E8-S3 | user_story | As security owner, I want secrets wired in CI/CD securely, so that preview/webhook/auth data stays protected. | ready | P1 | unassigned | E8-S1`, `E8-S2 | INV-5 | [E8-S3.md](./user-stories/E8-S3.md) |
| E9 | epic | Launch Hardening | backlog | P1 | unassigned | - | INV-5 | [E9.md](./epics/E9.md) |
| E9-S1 | user_story | As user, I want fast portfolio pages, so that experience is smooth on mobile. | ready | P1 | unassigned | E4-S1`, `E5-S1 | INV-5 | [E9-S1.md](./user-stories/E9-S1.md) |
| E9-S2 | user_story | As platform owner, I want security headers and basic monitoring, so that production risk is reduced. | ready | P1 | unassigned | E8-S2 | INV-5 | [E9-S2.md](./user-stories/E9-S2.md) |
| E9-S3 | user_story | As product owner, I want launch readiness sign-off, so that release is deterministic. | ready | P1 | unassigned | E9-S1`, `E9-S2 | INV-5 | [E9-S3.md](./user-stories/E9-S3.md) |

