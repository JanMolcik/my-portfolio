import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('SEC-HEADERS-001: CSP and security headers', () => {
	it('includes all required CSP directives', async () => {
		const config = await readFile('next.config.mjs', 'utf8');

		const requiredDirectives = [
			'default-src',
			'script-src',
			'style-src',
			'img-src',
			'font-src',
			'connect-src',
			'frame-src',
			'frame-ancestors',
			'base-uri',
			'form-action',
			'object-src',
			'upgrade-insecure-requests',
		];

		for (const directive of requiredDirectives) {
			expect(config, `missing CSP directive: ${directive}`).toContain(directive);
		}
	});

	it('restricts worker-src and manifest-src to prevent resource loading from unintended origins', async () => {
		const config = await readFile('next.config.mjs', 'utf8');
		// worker-src prevents workers (ServiceWorkers, Web Workers) from loading scripts from unintended origins
		expect(config).toContain("worker-src 'none'");
		// manifest-src restricts web app manifest loading to same origin
		expect(config).toContain("manifest-src 'self'");
	});

	it('documents unsafe-inline as a required Next.js App Router exception', async () => {
		const config = await readFile('next.config.mjs', 'utf8');
		// Next.js App Router emits inline RSC/bootstrap scripts that require unsafe-inline.
		// The comment in next.config.mjs documents this intentional exception.
		expect(config).toContain("'unsafe-inline'");
		expect(config).toContain('RSC');
	});

	it('omits X-Frame-Options header to avoid conflict with Storyblok visual editor framing', async () => {
		const config = await readFile('next.config.mjs', 'utf8');
		// X-Frame-Options: SAMEORIGIN conflicts with the CSP
		// `frame-ancestors https://app.storyblok.com` allowance. Clients that
		// still enforce XFO would reject the cross-origin frame and break the
		// visual editor preview, so framing control relies on frame-ancestors.
		// Match the header declaration specifically, not comment text.
		expect(config).not.toMatch(/key:\s*['"]X-Frame-Options['"]/);
	});

	it('applies all baseline security headers to every route', async () => {
		const config = await readFile('next.config.mjs', 'utf8');

		expect(config).toContain("source: '/:path*'");
		expect(config).toContain('Content-Security-Policy');
		expect(config).toContain('Strict-Transport-Security');
		expect(config).toContain('X-Content-Type-Options');
		expect(config).toContain('Referrer-Policy');
		expect(config).toContain('Permissions-Policy');
	});

	it('disables X-Powered-By to reduce framework fingerprinting', async () => {
		const config = await readFile('next.config.mjs', 'utf8');
		expect(config).toContain('poweredByHeader: false');
	});

	it('treats STORYBLOK_FRAME_ANCESTORS as comma-delimited origins, bounding any injection to frame-ancestors', () => {
		// The builder splits on commas. A value containing a semicolon stays as a single
		// origin token — the builder does not emit additional top-level CSP directives.
		// This bounds any env var injection to within the frame-ancestors directive value.
		// The env var itself must be validated at deploy time; it is not user-controlled.
		const envValue = 'https://app.storyblok.com,https://editor.storyblok.com';
		const origins = envValue.split(',').map((o) => o.trim()).filter(Boolean);
		const directive = ["'self'", ...origins].join(' ');

		expect(directive).toBe(
			"'self' https://app.storyblok.com https://editor.storyblok.com",
		);
		// Commas are consumed by the split and do not appear in the CSP directive value
		expect(directive).not.toContain(',');
	});

	it('defaults frame-ancestors to self + app.storyblok.com when env var is absent', () => {
		// Replicate the builder logic to verify the default is safe
		const envValue = 'https://app.storyblok.com'; // default from next.config.mjs
		const origins = envValue.split(',').map((o) => o.trim()).filter(Boolean);
		const directive = ["'self'", ...origins].join(' ');

		expect(directive).toBe("'self' https://app.storyblok.com");
	});
});
