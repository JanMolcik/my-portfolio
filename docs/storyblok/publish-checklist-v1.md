# Storyblok Publish Checklist v1

Use this checklist before publishing `page_project` or `page_writing` entries.

## Slug Governance

- [ ] Slug is unique within its section (`projects/*` or `writing/*`).
- [ ] Slug is populated from the `slug` field and matches the intended route path.

## SEO Governance

- [ ] SEO block is present exactly once (`seo` maximum 1 with `seo_meta`).
- [ ] `seo_meta.meta_title` and `seo_meta.meta_description` are both filled.
- [ ] `seo_meta.canonical_url` is set when canonical differs from route default.

## Final Publish Gate

- [ ] Storyblok schema source remains `data/storyblok/components/290927119725014/components.schema-v1.json`.
- [ ] Storyblok types are regenerated from schema v1: `pnpm run storyblok:types`.
- [ ] Generated type artifacts are updated: `src/types/generated/storyblok-schema.d.ts` and `src/types/generated/storyblok.d.ts`.
- [ ] Local contract check passes: `pnpm exec vitest run --config vitest.config.ts tests/contract/contract-sb-schema-001.spec.ts`.
