# Storyblok Baseline Content Import v1

This workflow imports baseline portfolio content from local Contentful export fixtures into a deterministic Storyblok import artifact and then applies the curated portfolio copy layer used for publishable CMS content.

## Source Inputs

- `data/contentful-export/entries.json`
- `data/contentful-export/assets.json`
- `data/contentful-export/meta.json`
- `src/lib/storyblok/contentful-mapping.ts`

## Build Import Artifact

```bash
pnpm run storyblok:baseline-import
```

Default output path:
- `data/storyblok/imports/290927119725014/baseline-content-import-v1.json`

Override target space id:

```bash
pnpm run storyblok:baseline-import -- --space "$STORYBLOK_SPACE_ID"
```

## Artifact Contract

`baseline-content-import-v1.json` must include:
- `content.home` (`page_home`) populated from legacy `about`
- `content.projects[]` (`page_project`) populated from legacy `project`
- `content.experience[]` (`item_experience`) populated from legacy `experience`
- `content.social_links[]` (`item_social_link`) populated from legacy `socialLink`
- curated home fields for `hero_intro`, `about_intro`, and availability copy
- curated project fields for hiring-facing summaries, case-study content, per-project `stack[]`, and deterministic `portfolio_priority`
- linked assets resolved to absolute URLs under `logo`, `image`, and `seo[*].og_image`
- zero unresolved asset references (`diagnostics.missing_asset_ids = []`)

## Verification

Run contract checks:

```bash
pnpm run test:contract
```

Manual QA evidence for `E2-S3` is tracked in:
- `docs/storyblok/e2-s3-manual-qa-signoff.md`

## Push Into Storyblok Space

Build baseline bundle and push it to the target Storyblok space:

```bash
pnpm run storyblok:baseline-import
pnpm run storyblok:baseline-push
```

Dry-run mode:

```bash
pnpm run storyblok:baseline-push:dry
```

Notes:
- `storyblok:baseline-push` upserts folders (`projects`, `experience`), all project stories, all experience stories, and rewrites root `home` story to `component: page_home`.
- It resolves `featured_projects` and `experience` home relations to created story references.
- After successful push, it refreshes local snapshot under `data/storyblok/stories/` via `storyblok stories pull`.
