# CI/CD Secrets Wiring and Rotation Runbook

## Goal

Wire required runtime variables through GitHub Actions and Vercel secret stores only, then rotate preview/webhook secrets on a fixed cadence without repository leakage.

## Required Secret Set

The following keys are mandatory in both GitHub Actions secrets and Vercel environment variables:

- `NEXT_PUBLIC_SITE_URL`
- `STORYBLOK_ACCESS_TOKEN`
- `STORYBLOK_PREVIEW_TOKEN`
- `PREVIEW_SECRET`
- `STORYBLOK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL`
- `CONTACT_TO_EMAIL`

## GitHub Actions Secret Wiring

Add repository secrets in GitHub:

1. GitHub -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`.
2. Create all required keys from the secret set.
3. Confirm `.github/workflows/ci.yml` maps each required key via `${{ secrets.<KEY> }}`.
4. Confirm workflow includes `Gate - Secrets Preflight` and passes on branch CI.

CLI alternative:

```bash
gh secret set NEXT_PUBLIC_SITE_URL --body "https://<your-domain>"
gh secret set STORYBLOK_ACCESS_TOKEN --body "<published-token>"
gh secret set STORYBLOK_PREVIEW_TOKEN --body "<preview-token>"
gh secret set PREVIEW_SECRET --body "<long-random-secret>"
gh secret set STORYBLOK_WEBHOOK_SECRET --body "<long-random-secret>"
gh secret set NEXT_PUBLIC_TURNSTILE_SITE_KEY --body "<turnstile-site-key>"
gh secret set TURNSTILE_SECRET_KEY --body "<turnstile-secret-key>"
gh secret set RESEND_API_KEY --body "<resend-api-key>"
gh secret set CONTACT_FROM_EMAIL --body "Portfolio <portfolio@your-domain>"
gh secret set CONTACT_TO_EMAIL --body "<your-inbox@your-domain>"
```

## Vercel Secret Wiring

Add the same keys to Vercel `Preview` and `Production` environments:

```bash
vercel env add NEXT_PUBLIC_SITE_URL preview
vercel env add NEXT_PUBLIC_SITE_URL production
vercel env add STORYBLOK_ACCESS_TOKEN preview
vercel env add STORYBLOK_ACCESS_TOKEN production
vercel env add STORYBLOK_PREVIEW_TOKEN preview
vercel env add STORYBLOK_PREVIEW_TOKEN production
vercel env add PREVIEW_SECRET preview
vercel env add PREVIEW_SECRET production
vercel env add STORYBLOK_WEBHOOK_SECRET preview
vercel env add STORYBLOK_WEBHOOK_SECRET production
vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY preview
vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY production
vercel env add TURNSTILE_SECRET_KEY preview
vercel env add TURNSTILE_SECRET_KEY production
vercel env add RESEND_API_KEY preview
vercel env add RESEND_API_KEY production
vercel env add CONTACT_FROM_EMAIL preview
vercel env add CONTACT_FROM_EMAIL production
vercel env add CONTACT_TO_EMAIL preview
vercel env add CONTACT_TO_EMAIL production
```

After updates, redeploy both environments or trigger fresh deployments.

Optional but recommended for distributed rate limiting on serverless deployments:

```bash
gh secret set UPSTASH_REDIS_REST_URL --body "<upstash-rest-url>"
gh secret set UPSTASH_REDIS_REST_TOKEN --body "<upstash-rest-token>"
vercel env add UPSTASH_REDIS_REST_URL preview
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN preview
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

## Rotation Policy

- `PREVIEW_SECRET` and `STORYBLOK_WEBHOOK_SECRET` must be rotated at least every 90 days.
- `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY` should follow provider rotation policy and be replaced immediately after suspected exposure.
- Tokens should be regenerated and updated in GitHub + Vercel on the same day.
- Old secret values must not be retained in repository files, artifacts, or issue comments.

## Rotation Procedure

1. Generate new random values for `PREVIEW_SECRET` and `STORYBLOK_WEBHOOK_SECRET` and fetch replacement provider keys if rotating Turnstile or Resend.
2. Update GitHub Actions secrets.
3. Update Vercel Preview and Production environment variables.
4. Trigger a Preview deployment and a Production deployment.
5. Verify preview entry, webhook revalidation, and contact form submission paths still authorize correctly.

## Same-Day Verification Gates

Run and keep evidence for the rotation day:

```bash
pnpm test:security
pnpm test:harness
pnpm tester-agent:run
```

Store links/artifacts in the task or PR notes:

1. GitHub Actions run URL showing green `Gate - Secrets Preflight`.
2. Vercel deployment URLs for Preview and Production after rotation.
3. Tester-agent report path under `artifacts/tester-agent/`.

## Repository Hygiene Rule

- Never commit `.env`, `.env.local`, or other secret-bearing env files.
- Keep only template placeholders in `.env.example` and `.env.ralph.example`.
- If accidental exposure happens, rotate all affected credentials immediately and document incident response in the PR/task log.
