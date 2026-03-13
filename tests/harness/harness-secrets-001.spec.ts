import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const REQUIRED_SECRET_KEYS = [
	'NEXT_PUBLIC_SITE_URL',
	'STORYBLOK_ACCESS_TOKEN',
	'STORYBLOK_PREVIEW_TOKEN',
	'PREVIEW_SECRET',
	'STORYBLOK_WEBHOOK_SECRET',
] as const;

describe('HARNESS-SECRETS-001', () => {
	it('keeps CI workflow wired to GitHub Actions secrets for required env vars', async () => {
		const workflow = await readFile('.github/workflows/ci.yml', 'utf8');

		for (const key of REQUIRED_SECRET_KEYS) {
			expect(workflow).toContain(`${key}: \${{ secrets.${key} }}`);
		}

		expect(workflow).toContain('Gate - Secrets Preflight');
	});

	it('keeps secrets rotation runbook aligned with required policy statements', async () => {
		const runbook = await readFile(
			'docs/ops/ci-cd-secrets-rotation.md',
			'utf8',
		);

		for (const key of REQUIRED_SECRET_KEYS) {
			expect(runbook).toContain(`\`${key}\``);
		}

		expect(runbook).toContain('at least every 90 days');
		expect(runbook).toContain('pnpm test:security');
		expect(runbook).toContain('pnpm test:harness');
		expect(runbook).toContain('pnpm tester-agent:run');
		expect(runbook).toContain('vercel env add');
		expect(runbook).toContain('gh secret set');
	});

	it('keeps secret-bearing env files out of tracked repository files', async () => {
		const { stdout } = await execFileAsync('git', ['ls-files']);
		const trackedFiles = stdout
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		const trackedEnvFiles = trackedFiles.filter((filePath) => {
			return filePath.startsWith('.env') && !filePath.endsWith('.example');
		});

		expect(trackedEnvFiles).toEqual([]);
	});
});
