import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';

function unquoteEnvValue(value: string): string {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

function loadLocalEnvForPlaywright() {
	const envPath = resolve(process.cwd(), '.env.local');
	if (!existsSync(envPath)) {
		return;
	}

	const envFile = readFileSync(envPath, 'utf8');
	for (const line of envFile.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
		if (!match) {
			continue;
		}

		const [, key, rawValue] = match;
		process.env[key] ??= unquoteEnvValue(rawValue);
	}
}

loadLocalEnvForPlaywright();

const baseURL =
	process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://127.0.0.1:3100';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30_000,
	fullyParallel: false,
	retries: 0,
	workers: 1,
	use: {
		baseURL,
	},
	webServer: {
		command: 'pnpm exec next dev -p 3100',
		url: `${baseURL}/favicon.ico`,
		timeout: 120_000,
		reuseExistingServer: true,
	},
});
