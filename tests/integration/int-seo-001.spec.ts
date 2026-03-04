import { describe, expect, it } from 'vitest';
import { buildStoryMetadata } from '@/lib/seo/metadata';
import type { StoryblokStory } from '@/lib/storyblok/content';

describe('INT-SEO-001', () => {
	it('uses deterministic fallback SEO values when fields are missing', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

		const story = {
			name: 'Project Alpha',
			content: {},
		} as StoryblokStory;

		const metadata = buildStoryMetadata(story, '/projects/project-alpha');
		expect(metadata.title).toBe('Project Alpha');
		expect(metadata.description).toBe('Project Alpha page');
		expect(metadata.alternates?.canonical).toBe(
			'https://example.com/projects/project-alpha',
		);

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});
});
