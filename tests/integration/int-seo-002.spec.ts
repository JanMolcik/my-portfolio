import { readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPublishedSitemapPathsMock = vi.hoisted(() => vi.fn());
const getPublishedWritingListMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/storyblok/content', () => {
	return {
		getPublishedSitemapPaths: getPublishedSitemapPathsMock,
	};
});

vi.mock('@/lib/storyblok/writing', () => {
	return {
		getPublishedWritingList: getPublishedWritingListMock,
	};
});

import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('INT-SEO-002', () => {
	beforeEach(() => {
		getPublishedSitemapPathsMock.mockReset();
		getPublishedWritingListMock.mockReset();
		getPublishedWritingListMock.mockResolvedValue({
			items: [],
			total: 0,
			page: 1,
			perPage: 9,
			totalPages: 0,
		});
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

		for (const routeFile of [
			'src/app/writing/page.tsx',
			'src/app/writing/page/[page]/page.tsx',
		]) {
			const source = await readFile(routeFile, 'utf8');
			expect(source).toContain("from '@/lib/seo/metadata'");
			expect(source).toContain('buildRouteMetadata');
		}
	});

	it('keeps top-level homepage sections in sequential heading order', async () => {
		const source = await readFile(
			'src/components/home/terminal-noir-home.tsx',
			'utf8',
		);
		expect(source).toContain('<h2 className={styles.srOnly}>About</h2>');
		expect(source).toContain('<h2 className={styles.srOnly}>Projects</h2>');
		expect(source).toContain('<h2 className={styles.srOnly}>Experience</h2>');
		expect(source).toContain('<h2 className={styles.srOnly}>Contact</h2>');
	});

	it('builds sitemap entries with canonical base URL from public site env', async () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';
		getPublishedSitemapPathsMock.mockResolvedValueOnce([
			'/',
			'/projects/alpha',
			'/writing/notes',
		]);
		getPublishedWritingListMock.mockResolvedValueOnce({
			items: [],
			total: 18,
			page: 1,
			perPage: 9,
			totalPages: 2,
		});

		const entries = await sitemap();
		expect(entries).toEqual([
			{ url: 'https://example.com/' },
			{ url: 'https://example.com/projects/alpha' },
			{ url: 'https://example.com/writing' },
			{ url: 'https://example.com/writing/notes' },
			{ url: 'https://example.com/writing/page/2' },
		]);

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('falls back to local index sitemap entries when Storyblok links fail closed', async () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
		getPublishedSitemapPathsMock.mockResolvedValueOnce([]);

		const entries = await sitemap();
		expect(entries).toEqual([
			{ url: 'https://example.com/' },
			{ url: 'https://example.com/writing' },
		]);

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
					'/api/contact',
					'/api/uptime',
				],
			},
		]);
		expect(metadata.sitemap).toBe('https://example.com/sitemap.xml');

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});
});
