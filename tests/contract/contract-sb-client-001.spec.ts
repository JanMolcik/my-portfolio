import { describe, expect, it } from 'vitest';
import { storyblokCacheKeys } from '@/lib/storyblok/cache-keys';
import {
	STORYBLOK_LINKS_PAGE_SIZE,
	STORYBLOK_LIST_PAGE_SIZE,
	STORYBLOK_LIST_RESOLVE_RELATIONS,
	STORYBLOK_PUBLISHED_SORT,
	getPublishedLinksParams,
	getPublishedStoriesByPrefixParams,
	getPublishedStoryEndpoint,
	getPublishedStoryParams,
	getPublishedStoryWithRelationsParams,
} from '@/lib/storyblok/queries';

describe('CONTRACT-SB-CLIENT-001', () => {
	it('builds deterministic Storyblok cache keys', () => {
		expect(storyblokCacheKeys.page('/projects/alpha/')).toBe(
			'storyblok:page:projects/alpha',
		);
		expect(storyblokCacheKeys.listByPrefix('projects/')).toBe(
			'storyblok:list:projects',
		);
		expect(storyblokCacheKeys.listProjects).toBe('storyblok:list:projects');
		expect(storyblokCacheKeys.listWriting).toBe('storyblok:list:writing');
	});

	it('provides published-only query helper params', () => {
		expect(getPublishedStoryEndpoint('projects/alpha')).toBe(
			'cdn/stories/projects/alpha',
		);
		expect(getPublishedStoryParams()).toEqual({
			version: 'published',
		});
		expect(
			getPublishedStoryWithRelationsParams(
				'page_home.featured_projects,page_home.experience',
			),
		).toEqual({
			version: 'published',
			resolve_relations: 'page_home.featured_projects,page_home.experience',
		});
		expect(getPublishedStoriesByPrefixParams('projects/')).toEqual({
			version: 'published',
			starts_with: 'projects/',
			resolve_relations: STORYBLOK_LIST_RESOLVE_RELATIONS,
			per_page: STORYBLOK_LIST_PAGE_SIZE,
			sort_by: STORYBLOK_PUBLISHED_SORT,
		});
		expect(getPublishedLinksParams()).toEqual({
			version: 'published',
			per_page: STORYBLOK_LINKS_PAGE_SIZE,
		});
	});
});
