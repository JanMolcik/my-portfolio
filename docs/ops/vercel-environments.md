# Vercel Environment Connection Runbook

## Goal

Connect this repository to Vercel so deployment routing is controlled and deterministic:

- Pull request branches -> `Preview` deployments
- `main` branch -> `Production` deployment

## Preconditions

1. Vercel account with access to the target team/project.
2. GitHub account with admin access to `JanMolcik/my-portfolio`.
3. Local shell access with the Vercel CLI available.

## Link Project Via Vercel CLI

Run in repository root:

```bash
vercel login
vercel link
```

Expected result:

- CLI creates `.vercel/project.json` with `projectId` and `orgId`.
- Linked project name matches this repository.

If `vercel` is not installed globally, run:

```bash
pnpm dlx vercel login
pnpm dlx vercel link
```

## Connect GitHub Integration

1. Open Vercel Dashboard -> project -> `Settings` -> `Git`.
2. Connect repository `JanMolcik/my-portfolio` if not already connected.
3. Confirm automatic deployments are enabled.

Required branch mapping:

- Pull request branches -> `Preview`
- `main` -> `Production`

## Verification Checklist

1. `vercel link` completed successfully and `.vercel/project.json` exists locally.
2. Vercel Git settings show GitHub repository connected.
3. Vercel Git settings show Production Branch set to `main`.
4. Open a test PR and confirm a `Preview` deployment is created automatically.
5. Merge to `main` and confirm a `Production` deployment is created automatically.

## Evidence to Record

Capture and store in PR/task notes:

1. CLI output from `vercel link` showing the linked project.
2. Screenshot or text evidence of Vercel `Settings -> Git` for repository connection and `main` production branch.
3. One Preview deployment URL from a PR build.
4. One Production deployment URL from a `main` build.
