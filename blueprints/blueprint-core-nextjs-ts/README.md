# Storyblok Core Next.js TypeScript Blueprint

TypeScript adaptation of the official Storyblok blueprint:
- Source repository: `https://github.com/storyblok/blueprint-core-nextjs`
- Source commit: `29b12c8778e54f04f04c29641be644389179ce4e`

## Why this exists

The upstream blueprint is JavaScript-first. This directory provides a TypeScript baseline so the portfolio project can be bootstrapped with strict typing from day 1.

## Included

- Next.js App Router baseline.
- Storyblok Visual Editor integration (`@storyblok/react/rsc`).
- Dynamic catch-all routing (`src/app/[[...slug]]/page.tsx`).
- Core default Storyblok blocks (`page`, `feature`, `grid`, `teaser`).
- TypeScript project config (`tsconfig.json`, typed components, typed route props).

## Quick start

```bash
cd blueprints/blueprint-core-nextjs-ts
npm install
cp .env.example .env
# fill STORYBLOK_DELIVERY_API_TOKEN and optional region/base URL
npm run dev:https
```

## Bootstrap into repository root

If you want to use this blueprint as the initial runtime in the repository root, copy these files into root and keep existing canonical docs (`docs/spec`, `AGENTS.md`, `ARCHITECTURE.md`) unchanged.

Recommended file groups to copy:
- `package.json`
- `tsconfig.json`
- `next.config.mjs`
- `eslint.config.mjs`
- `src/`
- `.env.example`

After copying:

```bash
npm install
npm run typecheck
npm run lint
npm run dev:https
```

## Notes

- This blueprint remains intentionally close to upstream behavior and naming.
- Portfolio-specific architecture/modules from `ARCHITECTURE.md` should be layered on top in subsequent implementation stories.
