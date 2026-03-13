import { defineConfig } from '@playwright/test';

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
