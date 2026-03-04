import { getStoryblokApi } from '@/lib/storyblok';
import type { ISbStoryData } from '@storyblok/react/rsc';

const PUBLISHED_PARAMS = {
	version: 'published' as const,
};

type StoryblokStoryContent = {
	seo?: {
		meta_title?: string;
		meta_description?: string;
		canonical_url?: string;
		noindex?: boolean;
		og_image?: string | { filename?: string };
	};
};

export type StoryblokStory = ISbStoryData<StoryblokStoryContent>;

type StoryblokListResponse = {
	stories?: StoryblokStory[];
};

type StoryblokSingleResponse = {
	story?: StoryblokStory;
};

export async function getPublishedStory(
	fullSlug: string,
): Promise<StoryblokStory | null> {
	const storyblokApi = getStoryblokApi();
	try {
		const { data } = await storyblokApi.get(
			`cdn/stories/${fullSlug}`,
			PUBLISHED_PARAMS,
		);
		const payload = data as StoryblokSingleResponse;
		return payload.story ?? null;
	} catch {
		return null;
	}
}

export async function getPublishedStoriesByPrefix(
	prefix: string,
): Promise<StoryblokStory[]> {
	const storyblokApi = getStoryblokApi();
	try {
		const { data } = await storyblokApi.get('cdn/stories', {
			...PUBLISHED_PARAMS,
			starts_with: prefix,
			per_page: 100,
			sort_by: 'published_at:desc',
		});
		const payload = data as StoryblokListResponse;
		return payload.stories ?? [];
	} catch {
		return [];
	}
}

export async function getPublishedRouteParamsByPrefix(
	prefix: string,
): Promise<Array<{ slug: string }>> {
	const stories = await getPublishedStoriesByPrefix(prefix);
	return stories
		.map((story) => story.full_slug ?? '')
		.filter((fullSlug) => fullSlug.startsWith(prefix))
		.map((fullSlug) => fullSlug.slice(prefix.length))
		.filter((slug) => slug.length > 0 && !slug.includes('/'))
		.map((slug) => ({ slug }));
}
