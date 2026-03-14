import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as uptimeCheck } from '@/app/api/uptime/route';

async function listSourceFiles(rootDir: string): Promise<string[]> {
	const entries = await readdir(rootDir, { withFileTypes: true });
	const nestedPaths = await Promise.all(
		entries.map(async (entry) => {
			const entryPath = path.join(rootDir, entry.name);
			if (entry.isDirectory()) {
				return listSourceFiles(entryPath);
			}
			return [entryPath];
		}),
	);

	return nestedPaths.flat();
}

describe('SEC-PUBLISHED-ONLY-001', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('keeps non-preview content fetch pinned to published mode', async () => {
		const queryHelpers = await readFile('src/lib/storyblok/queries.ts', 'utf8');
		expect(queryHelpers).toContain("STORYBLOK_PUBLISHED_VERSION = 'published'");
	});

	it('documents preview and webhook secret requirements', async () => {
		const spec = await readFile('docs/spec/PROJECT_SPEC.md', 'utf8');
		expect(spec).toContain('PREVIEW_SECRET');
		expect(spec).toContain('STORYBLOK_WEBHOOK_SECRET');
		expect(spec).toContain('NEXT_PUBLIC_TURNSTILE_SITE_KEY');
		expect(spec).toContain('TURNSTILE_SECRET_KEY');
		expect(spec).toContain('RESEND_API_KEY');
		expect(spec).toContain('CONTACT_FROM_EMAIL');
		expect(spec).toContain('CONTACT_TO_EMAIL');
		expect(spec).toContain('constant time');
	});

	it('configures baseline security headers for all routes', async () => {
		const config = await readFile('next.config.mjs', 'utf8');

		expect(config).toContain('async headers()');
		expect(config).toContain('Content-Security-Policy');
		expect(config).toContain('Strict-Transport-Security');
		expect(config).toContain('X-Content-Type-Options');
		expect(config).toContain('Referrer-Policy');
		expect(config).toContain('Permissions-Policy');
		expect(config).toContain('frame-ancestors');
		expect(config).toContain("object-src 'none'");
		expect(config).toContain("script-src-attr 'none'");
		expect(config).toContain('https://challenges.cloudflare.com');
		expect(config).toContain('https://app.storyblok.com');
	});

	it('limits custom inline script sinks to serialized JSON-LD route scripts', async () => {
		const sourceFiles = (await listSourceFiles('src')).filter((filePath) =>
			filePath.endsWith('.ts') || filePath.endsWith('.tsx'),
		);
		const filesWithInlineHtml: string[] = [];

		for (const filePath of sourceFiles) {
			const source = await readFile(filePath, 'utf8');
			if (!source.includes('dangerouslySetInnerHTML')) {
				continue;
			}

			filesWithInlineHtml.push(filePath);
			expect(source).toContain('type="application/ld+json"');
			expect(source).toContain('serializeJsonLd(');
		}

		expect(filesWithInlineHtml.sort()).toEqual([
			'src/app/page.tsx',
			'src/app/projects/[slug]/page.tsx',
			'src/app/writing/[slug]/page.tsx',
		]);
	});

	it('exposes an uptime endpoint for basic external monitoring checks', async () => {
		const response = await uptimeCheck();
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
		await expect(response.json()).resolves.toMatchObject({
			status: 'ok',
		});
	});

	it('logs structured server errors when uptime checks fail', async () => {
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		vi.spyOn(process, 'uptime').mockImplementation(() => {
			throw new Error('uptime unavailable');
		});

		const response = await uptimeCheck();
		expect(response.status).toBe(500);
		expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

		const logEntry = consoleErrorSpy.mock.calls[0]?.[0];
		expect(typeof logEntry).toBe('string');
		expect(JSON.parse(logEntry as string)).toMatchObject({
			level: 'error',
			event: 'uptime_check_failed',
		});
	});

	it('wires operational API handlers to structured server error logging', async () => {
		const routeFiles = [
			'src/app/api/preview/route.ts',
			'src/app/api/exit-preview/route.ts',
			'src/app/api/revalidate/storyblok/route.ts',
			'src/app/api/contact/route.ts',
		];

		for (const routeFile of routeFiles) {
			const source = await readFile(routeFile, 'utf8');
			expect(source).toContain('logServerError(');
		}
	});
});
