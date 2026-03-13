import { readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPublishedSitemapPathsMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/storyblok/content', () => {
	return {
		getPublishedSitemapPaths: getPublishedSitemapPathsMock,
	};
});

import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('INT-SEO-002', () => {
	beforeEach(() => {
		getPublishedSitemapPathsMock.mockReset();
	});

	it('centralizes route metadata and JSON-LD building through src/lib/seo/*', async () => {
		const routeFiles = [
			'src/app/page.tsx',
			'src/app/projects/[slug]/page.tsx',
			'src/app/writing/[slug]/page.tsx',
		];

		for (const routeFile of routeFiles) {
			const source = await readFile(routeFile, 'utf8');
			expect(source).toContain("from '@/lib/seo/metadata'");
			expect(source).toContain("from '@/lib/seo/json-ld'");
			expect(source).toContain('buildNotFoundMetadata');
			expect(source).toContain('buildStoryMetadata');
			expect(source).toContain('type="application/ld+json"');
			expect(source).toContain('serializeJsonLd');
		}
	});

	it('builds sitemap entries with canonical base URL from public site env', async () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';
		getPublishedSitemapPathsMock.mockResolvedValueOnce([
			'/',
			'/projects/alpha',
			'/writing/notes',
		]);

		const entries = await sitemap();
		expect(entries).toEqual([
			{ url: 'https://example.com/' },
			{ url: 'https://example.com/projects/alpha' },
			{ url: 'https://example.com/writing/notes' },
		]);

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('falls back to home-only sitemap entry when Storyblok links fail closed', async () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
		getPublishedSitemapPathsMock.mockResolvedValueOnce([]);

		const entries = await sitemap();
		expect(entries).toEqual([{ url: 'https://example.com/' }]);

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('builds robots policy with sitemap URL and operational path disallow rules', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';

		const metadata = robots();
		expect(metadata.rules).toEqual([
			{
				userAgent: '*',
				allow: '/',
				disallow: [
					'/api/preview',
					'/api/exit-preview',
					'/api/revalidate/storyblok',
					'/api/uptime',
				],
			},
		]);
		expect(metadata.sitemap).toBe('https://example.com/sitemap.xml');

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});
});
