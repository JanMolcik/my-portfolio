import { describe, expect, it } from 'vitest';
import { buildNotFoundMetadata, buildStoryMetadata } from '@/lib/seo/metadata';
import {
	getAbsoluteSiteUrl,
	getMetadataBaseUrl,
	getSiteUrl,
} from '@/lib/seo/site-url';
import type { StoryblokStory } from '@/lib/storyblok/content';

describe('UNIT-VAL-001', () => {
	it('builds non-indexable metadata for not-found states', () => {
		const metadata = buildNotFoundMetadata('Project |');
		expect(metadata.title).toBe('Project | Not Found');
		expect(metadata.robots).toEqual({
			index: false,
			follow: false,
		});
	});

	it('builds canonical and OG metadata from Storyblok SEO fields', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';

		const story = {
			name: 'Portfolio Home',
			content: {
				seo: {
					meta_title: 'Home',
					meta_description: 'Description',
					canonical_url: 'https://example.com/',
					og_image: { filename: 'https://cdn.example.com/og.png' },
					noindex: false,
				},
			},
		} as StoryblokStory;

		const metadata = buildStoryMetadata(story, '/');

		expect(metadata.title).toBe('Home');
		expect(metadata.description).toBe('Description');
		expect(metadata.alternates?.canonical).toBe('https://example.com/');
		expect(metadata.openGraph?.images).toEqual([
			{ url: 'https://cdn.example.com/og.png' },
		]);
		expect(metadata.robots).toEqual({ index: true, follow: true });

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('builds route-unique fallback metadata for indexable page families', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

		const story = {
			name: 'Shared Entry',
			content: {},
		} as StoryblokStory;

		const homeMetadata = buildStoryMetadata(story, '/');
		const projectMetadata = buildStoryMetadata(story, '/projects/shared-entry');
		const writingMetadata = buildStoryMetadata(story, '/writing/shared-entry');

		expect(homeMetadata.title).toBe('Shared Entry | Home');
		expect(projectMetadata.title).toBe('Shared Entry | Project');
		expect(writingMetadata.title).toBe('Shared Entry | Writing');

		expect(homeMetadata.description).toBe('Home page for Shared Entry.');
		expect(projectMetadata.description).toBe('Project page for Shared Entry.');
		expect(writingMetadata.description).toBe('Writing page for Shared Entry.');

		expect(homeMetadata.alternates?.canonical).toBe('https://example.com/');
		expect(projectMetadata.alternates?.canonical).toBe(
			'https://example.com/projects/shared-entry',
		);
		expect(writingMetadata.alternates?.canonical).toBe(
			'https://example.com/writing/shared-entry',
		);

		expect(homeMetadata.openGraph?.images).toEqual([
			{ url: 'https://example.com/favicon.ico' },
		]);
		expect(projectMetadata.openGraph?.images).toEqual([
			{ url: 'https://example.com/favicon.ico' },
		]);
		expect(writingMetadata.openGraph?.images).toEqual([
			{ url: 'https://example.com/favicon.ico' },
		]);

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('normalizes absolute site URLs through central helper', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';

		expect(getSiteUrl()).toBe('https://example.com');
		expect(getAbsoluteSiteUrl('/projects/alpha')).toBe(
			'https://example.com/projects/alpha',
		);
		expect(getMetadataBaseUrl().toString()).toBe('https://example.com/');

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('fails closed in production when NEXT_PUBLIC_SITE_URL is missing', () => {
		const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
		const previousNodeEnv = process.env.NODE_ENV;
		const env = process.env as Record<string, string | undefined>;

		delete process.env.NEXT_PUBLIC_SITE_URL;
		env.NODE_ENV = 'production';

		expect(() => getSiteUrl()).toThrow(
			/NEXT_PUBLIC_SITE_URL is required in production/,
		);

		env.NODE_ENV = previousNodeEnv;
		process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
	});
});
