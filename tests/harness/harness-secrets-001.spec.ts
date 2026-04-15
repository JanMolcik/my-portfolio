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
	'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
	'TURNSTILE_SECRET_KEY',
	'RESEND_API_KEY',
	'CONTACT_FROM_EMAIL',
	'CONTACT_TO_EMAIL',
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

	it('T4: does not expose STORYBLOK_PREVIEW_TOKEN in next.config.mjs public env block', async () => {
		const config = await readFile('next.config.mjs', 'utf8');
		const envBlockMatch = config.match(/\benv:\s*\{[^}]+\}/s);
		expect(
			envBlockMatch,
			'env block not found in next.config.mjs',
		).not.toBeNull();
		const envBlock = envBlockMatch![0];
		expect(envBlock).not.toContain('STORYBLOK_PREVIEW_TOKEN');
	});

	it('T4b: does not expose any of the 4 sensitive tokens in next.config.mjs public env block', async () => {
		const config = await readFile('next.config.mjs', 'utf8');
		const envBlockMatch = config.match(/\benv:\s*\{[^}]+\}/s);
		expect(
			envBlockMatch,
			'env block not found in next.config.mjs',
		).not.toBeNull();
		const envBlock = envBlockMatch![0];

		const sensitiveKeys = [
			'STORYBLOK_PREVIEW_TOKEN',
			'STORYBLOK_ACCESS_TOKEN',
			'PREVIEW_SECRET',
			'STORYBLOK_WEBHOOK_SECRET',
		] as const;

		for (const key of sensitiveKeys) {
			expect(
				envBlock,
				`${key} must not appear in next.config.mjs env block`,
			).not.toContain(key);
		}
	});
});
