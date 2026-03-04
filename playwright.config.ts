import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30_000,
	fullyParallel: false,
	retries: 0,
	workers: 1,
	use: {
		baseURL: 'http://127.0.0.1:3100',
	},
	webServer: {
		command: 'pnpm exec next dev -p 3100',
		url: 'http://127.0.0.1:3100/favicon.ico',
		timeout: 120_000,
		reuseExistingServer: true,
	},
});
