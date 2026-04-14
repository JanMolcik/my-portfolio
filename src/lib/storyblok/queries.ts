export const STORYBLOK_STORIES_ENDPOINT = 'cdn/stories';
export const STORYBLOK_LINKS_ENDPOINT = 'cdn/links';
export const STORYBLOK_PUBLISHED_VERSION = 'published';
export const STORYBLOK_DRAFT_VERSION = 'draft';
export const STORYBLOK_PUBLISHED_SORT = 'published_at:desc';
export const STORYBLOK_WRITING_SORT = 'content.published_date:desc,slug:asc';
export const STORYBLOK_HOME_RESOLVE_RELATIONS =
	'page_home.featured_projects,page_home.experience';
export const STORYBLOK_LIST_RESOLVE_RELATIONS =
	STORYBLOK_HOME_RESOLVE_RELATIONS;
export const STORYBLOK_LIST_PAGE_SIZE = 100;
export const STORYBLOK_LINKS_PAGE_SIZE = 1000;
export const STORYBLOK_WRITING_PAGE_SIZE = 9;

export type StoryblokContentMode =
	| typeof STORYBLOK_PUBLISHED_VERSION
	| typeof STORYBLOK_DRAFT_VERSION;

export type StoryblokPublishedStoryParams = {
	version: typeof STORYBLOK_PUBLISHED_VERSION;
};

export type StoryblokPublishedStoryWithRelationsParams =
	StoryblokPublishedStoryParams & {
		resolve_relations: string;
	};

export type StoryblokPublishedStoryListParams =
	StoryblokPublishedStoryParams & {
		starts_with: string;
		resolve_relations: typeof STORYBLOK_LIST_RESOLVE_RELATIONS;
		per_page: typeof STORYBLOK_LIST_PAGE_SIZE;
		sort_by: typeof STORYBLOK_PUBLISHED_SORT;
	};

export type StoryblokPublishedLinksParams = StoryblokPublishedStoryParams & {
	per_page: typeof STORYBLOK_LINKS_PAGE_SIZE;
};

export function getPublishedStoryEndpoint(
	fullSlug: string,
): `cdn/stories/${string}` {
	return `${STORYBLOK_STORIES_ENDPOINT}/${fullSlug}`;
}

export function getPublishedStoryParams(): StoryblokPublishedStoryParams {
	return {
		version: STORYBLOK_PUBLISHED_VERSION,
	};
}

export function getPublishedStoryWithRelationsParams(
	resolveRelations: string,
): StoryblokPublishedStoryWithRelationsParams {
	return {
		...getPublishedStoryParams(),
		resolve_relations: resolveRelations,
	};
}

export function getPublishedStoriesByPrefixParams(
	prefix: string,
): StoryblokPublishedStoryListParams {
	return {
		...getPublishedStoryParams(),
		starts_with: prefix,
		resolve_relations: STORYBLOK_LIST_RESOLVE_RELATIONS,
		per_page: STORYBLOK_LIST_PAGE_SIZE,
		sort_by: STORYBLOK_PUBLISHED_SORT,
	};
}

export function getPublishedLinksParams(): StoryblokPublishedLinksParams {
	return {
		...getPublishedStoryParams(),
		per_page: STORYBLOK_LINKS_PAGE_SIZE,
	};
}
