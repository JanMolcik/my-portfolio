import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/storyblok', () => {
	return {
		getStoryblokApi: () => ({
			get: getMock,
		}),
	};
});

import {
	getPublishedRouteParamsByPrefix,
	getPublishedStoriesByPrefix,
	getPublishedStory,
} from '@/lib/storyblok/content';

describe('CONTRACT-SB-001', () => {
	beforeEach(() => {
		getMock.mockReset();
	});

	it('returns null on fetch failure for single-story queries', async () => {
		getMock.mockRejectedValueOnce(new Error('network error'));
		await expect(getPublishedStory('projects/alpha')).resolves.toBeNull();
	});

	it('returns published stories ordered from Storyblok list payload', async () => {
		getMock.mockResolvedValueOnce({
			data: {
				stories: [
					{ full_slug: 'projects/beta' },
					{ full_slug: 'projects/alpha' },
				],
			},
		});

		const stories = await getPublishedStoriesByPrefix('projects/');
		expect(stories).toHaveLength(2);
		expect(getMock).toHaveBeenCalledWith('cdn/stories', {
			version: 'published',
			starts_with: 'projects/',
			per_page: 100,
			sort_by: 'published_at:desc',
		});
	});

	it('normalizes static params from slug prefixes', async () => {
		getMock.mockResolvedValueOnce({
			data: {
				stories: [
					{ full_slug: 'projects/alpha' },
					{ full_slug: 'projects/beta' },
					{ full_slug: 'projects/nested/path' },
				],
			},
		});

		const params = await getPublishedRouteParamsByPrefix('projects/');
		expect(params).toEqual([{ slug: 'alpha' }, { slug: 'beta' }]);
	});
});
