import { describe, expect, it } from 'vitest';
import { buildNotFoundMetadata, buildStoryMetadata } from '@/lib/seo/metadata';
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
});
