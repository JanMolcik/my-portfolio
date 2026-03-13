# Storyblok Preview and Publish Flow

## Goal

Document the exact runtime flow between Storyblok editor changes, local/preview rendering, and production content delivery so content editing can happen safely without code-side migrations.

## Current Runtime Behavior

### 1. Normal site traffic

- Public routes (`/`, `/projects/[slug]`, `/writing/[slug]`) fetch Storyblok content through the CDN API in `published` mode.
- The fetch layer lives in [content.ts](/Users/janmo/Code/my-portfolio/src/lib/storyblok/content.ts).
- Request mode constants live in [queries.ts](/Users/janmo/Code/my-portfolio/src/lib/storyblok/queries.ts).
- Published delivery uses `STORYBLOK_ACCESS_TOKEN`.
- Route handlers/pages are static with `revalidate = 3600`, so without webhook revalidation the production site can lag behind Storyblok by up to one hour.

### 2. Visual editor / preview

- Storyblok preview opens a URL hitting [preview route](/Users/janmo/Code/my-portfolio/src/app/api/preview/route.ts).
- That route validates `PREVIEW_SECRET`, enables Next.js `draftMode`, and redirects to the requested path.
- Once `draftMode` is enabled, route pages switch from `published` to `draft` mode via [preview-mode.ts](/Users/janmo/Code/my-portfolio/src/lib/storyblok/preview-mode.ts).
- Draft requests use `STORYBLOK_PREVIEW_TOKEN` and add a cache-busting `cv` param.
- On the homepage, draft mode also enables `StoryblokLiveEditing`, which is why edits appear immediately in the visual editor.

Recommended preview URL template in Storyblok:

```text
https://<your-site>/api/preview?secret=<PREVIEW_SECRET>&slug={{full_slug}}
```

Optional exit-preview URL:

```text
https://<your-site>/api/exit-preview?secret=<PREVIEW_SECRET>&path=/
```

### 3. Publish to production

- Storyblok `Publish` does not push content directly into the app database. There is no local database copy.
- Instead, Storyblok stores the published version, and the app reads it from the CDN API on the next render/revalidation.
- To make production update quickly, Storyblok must call [revalidate webhook route](/Users/janmo/Code/my-portfolio/src/app/api/revalidate/storyblok/route.ts).
- That route validates `STORYBLOK_WEBHOOK_SECRET`, accepts publish/unpublish/delete events, derives the affected slug, and calls `revalidatePath(...)` for the affected route scope.

Recommended production webhook target:

```text
https://<your-site>/api/revalidate/storyblok?secret=<STORYBLOK_WEBHOOK_SECRET>
```

Accepted webhook inputs are intentionally flexible:

- query param `secret`
- `webhook-token`
- `x-webhook-token`
- `x-storyblok-token`
- bearer token in `Authorization`

The route also enforces idempotency using `story_id + event + published_at`.

## What Must Be Configured Outside the Repo

These pieces are not stored in git and must be configured in hosting + Storyblok:

1. `STORYBLOK_ACCESS_TOKEN`
2. `STORYBLOK_PREVIEW_TOKEN`
3. `PREVIEW_SECRET`
4. `STORYBLOK_WEBHOOK_SECRET`
5. Storyblok preview URL
6. Storyblok publish webhook URL
7. Correct production domain in `NEXT_PUBLIC_SITE_URL`

Secret wiring reference: [ci-cd-secrets-rotation.md](/Users/janmo/Code/my-portfolio/docs/ops/ci-cd-secrets-rotation.md)

## Manual Verification Checklist

1. Open Storyblok visual editor and confirm preview URL hits `/api/preview`.
2. Edit a draft field and confirm the preview updates immediately.
3. Publish the story.
4. Confirm Storyblok webhook logs a `200` or `202` on `/api/revalidate/storyblok`.
5. Reload the affected production route and confirm the published change is visible.

## Important Failure Modes

- If preview works but production does not update quickly, the usual cause is missing or misconfigured publish webhook.
- If production webhook is missing entirely, content still updates eventually through ISR (`revalidate = 3600`) or a fresh deployment.
- If the editor shows empty values for filled fields, the usual cause is schema/data drift, not missing content. This repo now guards against that with snapshot contracts over required fields, multi-select shapes, and datetime format.
