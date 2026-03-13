# Storyblok Schema v1 Workflow

This repository manages Storyblok schema v1 through CLI artifacts under `data/storyblok/`.

Legacy Contentful mapping contract for migration is documented in:
- `docs/storyblok/contentful-mapping-v1.md`

Baseline content import workflow is documented in:
- `docs/storyblok/baseline-content-import-v1.md`

Publish-time governance checks are documented in:
- `docs/storyblok/publish-checklist-v1.md`

## Prerequisites

1. Install Storyblok CLI.
2. Authenticate with Storyblok:

```bash
storyblok login
```

## 1. Push Components Schema v1

Components are stored in:
- `data/storyblok/components/290927119725014/components.schema-v1.json`

Apply schema v1 with `storyblok components`:

```bash
storyblok components push \
  --space "$STORYBLOK_SPACE_ID" \
  --from "290927119725014" \
  --path "data/storyblok" \
  --suffix "schema-v1"
```

## 2. Run Schema v1 Migrations

Migrations are stored in:
- `data/storyblok/migrations/290927119725014/*.schema-v1.js`

Preview migration impact first:

```bash
storyblok migrations run \
  --space "$STORYBLOK_SPACE_ID" \
  --path "data/storyblok" \
  --dry-run
```

Then apply migrations:

```bash
storyblok migrations run \
  --space "$STORYBLOK_SPACE_ID" \
  --path "data/storyblok"
```

## 3. Optional Verification Pull

```bash
storyblok components pull \
  --space "$STORYBLOK_SPACE_ID" \
  --path "data/storyblok" \
  --filename "components-post-v1" \
  --suffix "post-v1"
```

## 4. Regenerate Local Type Artifacts (Required After Schema Changes)

```bash
pnpm run storyblok:types
```

This command runs `storyblok types generate` against local schema v1 artifacts and synchronizes:
- `data/storyblok/types/290927119725014/storyblok-schema.d.ts`
- `data/storyblok/types/storyblok.d.ts`
- `src/types/generated/storyblok-schema.d.ts`
- `src/types/generated/storyblok.d.ts`

## 5. Publish Governance Check (Required Before Publish)

Run through:
- `docs/storyblok/publish-checklist-v1.md`

## 6. Baseline Content Push (Contentful -> Storyblok)

```bash
pnpm run storyblok:baseline-import
pnpm run storyblok:baseline-push
```

Dry-run:

```bash
pnpm run storyblok:baseline-push:dry
```
