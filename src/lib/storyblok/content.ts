import type { ISbStoryData } from '@storyblok/react/rsc';
import { z } from 'zod';
import { getStoryblokApi } from './client';
import {
	STORYBLOK_DRAFT_VERSION,
	STORYBLOK_LINKS_ENDPOINT,
	STORYBLOK_HOME_RESOLVE_RELATIONS,
	STORYBLOK_PUBLISHED_VERSION,
	STORYBLOK_STORIES_ENDPOINT,
	type StoryblokContentMode,
	getPublishedLinksParams,
	getPublishedStoriesByPrefixParams,
	getPublishedStoryEndpoint,
	getPublishedStoryParams,
	getPublishedStoryWithRelationsParams,
} from './queries';

type StoryblokStoryContent = {
	seo?:
		| {
				meta_title?: string;
				meta_description?: string;
				canonical_url?: string;
				noindex?: boolean;
				og_image?: string | { filename?: string; src?: string };
		  }
		| Array<{
				meta_title?: string;
				meta_description?: string;
				canonical_url?: string;
				noindex?: boolean;
				og_image?: string | { filename?: string; src?: string };
		  }>;
};

export type StoryblokStory = ISbStoryData<StoryblokStoryContent>;
export type StoryblokResolvedRelationStory = ISbStoryData<
	Record<string, unknown>
>;

const seoSchema = z
	.object({
		meta_title: z.string().optional(),
		meta_description: z.string().optional(),
		canonical_url: z.string().optional(),
		noindex: z.boolean().optional(),
		og_image: z
			.union([
				z.string(),
				z.object({
					filename: z.string().optional(),
					src: z.string().optional(),
				}),
			])
			.optional(),
	})
	.passthrough();

const renderStorySchema = z
	.object({
		content: z
			.object({
				seo: z.union([seoSchema, z.array(seoSchema)]).optional(),
			})
			.passthrough(),
	})
	.passthrough();

const singleStoryResponseSchema = z.object({
	story: renderStorySchema.optional(),
});

const singleStoryWithRelationsResponseSchema = singleStoryResponseSchema.extend(
	{
		rels: z.array(renderStorySchema).optional(),
	},
);

const storyListItemSchema = z
	.object({
		full_slug: z.string().min(1),
	})
	.passthrough();

const storyListResponseSchema = z.object({
	stories: z.array(storyListItemSchema).optional(),
});

const linkItemSchema = z
	.object({
		slug: z.string().optional(),
		is_folder: z.boolean().optional(),
		published: z.boolean().optional(),
	})
	.passthrough();

const linksResponseSchema = z.object({
	links: z.record(z.string(), linkItemSchema).optional(),
});

type StoryblokListResponse = {
	stories?: Array<Pick<StoryblokStory, 'full_slug'>>;
};

type StoryblokLinksResponse = {
	links?: Record<
		string,
		{
			slug?: string;
			is_folder?: boolean;
			published?: boolean;
		}
	>;
};

type StoryblokSingleResponse = {
	story?: StoryblokStory;
};

type StoryblokSingleWithRelationsResponse = StoryblokSingleResponse & {
	rels?: StoryblokResolvedRelationStory[];
};

export type StoryblokRequestParams = Record<string, string | number>;

function mapLinkSlugToRoutePath(slug: string): string | null {
	if (slug === 'home') {
		return '/';
	}

	if (slug.startsWith('projects/')) {
		const routeSlug = slug.slice('projects/'.length);
		if (routeSlug.length > 0 && !routeSlug.includes('/')) {
			return `/projects/${routeSlug}`;
		}
		return null;
	}

	if (slug.startsWith('writing/')) {
		const routeSlug = slug.slice('writing/'.length);
		if (routeSlug.length > 0 && !routeSlug.includes('/')) {
			return `/writing/${routeSlug}`;
		}
	}

	return null;
}

function getPreviewToken(): string | null {
	const previewToken = process.env.STORYBLOK_PREVIEW_TOKEN?.trim();
	if (previewToken) {
		return previewToken;
	}

	const allowAccessTokenFallback = process.env.NODE_ENV === 'development';
	if (!allowAccessTokenFallback) {
		return null;
	}

	const accessToken =
		process.env.STORYBLOK_ACCESS_TOKEN?.trim() ||
		process.env.STORYBLOK_DELIVERY_API_TOKEN?.trim();
	if (!accessToken) {
		return null;
	}

	return accessToken;
}

function shouldForcePublishedCvInDev(): boolean {
	if (process.env.NODE_ENV !== 'development') {
		return false;
	}

	const raw = process.env.STORYBLOK_DEV_FORCE_PUBLISHED_CV;
	if (!raw) {
		return true;
	}

	const normalized = raw.trim().toLowerCase();
	return ['1', 'true', 'yes', 'on'].includes(normalized);
}

export function getStoryblokRequestParamsByMode(
	params: StoryblokRequestParams,
	mode: StoryblokContentMode,
): StoryblokRequestParams | null {
	if (mode === STORYBLOK_PUBLISHED_VERSION) {
		if (shouldForcePublishedCvInDev()) {
			return {
				...params,
				cv: Date.now(),
			};
		}
		return params;
	}

	const previewToken = getPreviewToken();
	if (!previewToken) {
		return null;
	}

	return {
		...params,
		version: STORYBLOK_DRAFT_VERSION,
		token: previewToken,
		cv: Date.now(),
	};
}

export async function getPublishedStory(
	fullSlug: string,
	mode: StoryblokContentMode = STORYBLOK_PUBLISHED_VERSION,
): Promise<StoryblokStory | null> {
	const storyblokApi = getStoryblokApi();
	const params = getStoryblokRequestParamsByMode(
		getPublishedStoryParams(),
		mode,
	);
	if (!params) {
		return null;
	}

	try {
		const { data } = await storyblokApi.get(
			getPublishedStoryEndpoint(fullSlug),
			params,
		);
		const payload = singleStoryResponseSchema.parse(
			data,
		) as StoryblokSingleResponse;
		return payload.story ?? null;
	} catch {
		return null;
	}
}

export async function getPublishedHomeStory(
	mode: StoryblokContentMode = STORYBLOK_PUBLISHED_VERSION,
): Promise<{
	story: StoryblokStory;
	rels: StoryblokResolvedRelationStory[];
} | null> {
	const storyblokApi = getStoryblokApi();
	const params = getStoryblokRequestParamsByMode(
		getPublishedStoryWithRelationsParams(STORYBLOK_HOME_RESOLVE_RELATIONS),
		mode,
	);
	if (!params) {
		return null;
	}

	try {
		const { data } = await storyblokApi.get(
			getPublishedStoryEndpoint('home'),
			params,
		);
		const payload = singleStoryWithRelationsResponseSchema.parse(
			data,
		) as StoryblokSingleWithRelationsResponse;
		if (!payload.story) {
			return null;
		}
		return {
			story: payload.story,
			rels: payload.rels ?? [],
		};
	} catch {
		return null;
	}
}

export async function getPublishedStoriesByPrefix(
	prefix: string,
): Promise<Array<Pick<StoryblokStory, 'full_slug'>>> {
	const storyblokApi = getStoryblokApi();
	try {
		const { data } = await storyblokApi.get(
			STORYBLOK_STORIES_ENDPOINT,
			getPublishedStoriesByPrefixParams(prefix),
		);
		const payload = storyListResponseSchema.parse(
			data,
		) as StoryblokListResponse;
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

export async function getPublishedSitemapPaths(): Promise<string[]> {
	const storyblokApi = getStoryblokApi();
	try {
		const { data } = await storyblokApi.get(
			STORYBLOK_LINKS_ENDPOINT,
			getPublishedLinksParams(),
		);
		const payload = linksResponseSchema.parse(data) as StoryblokLinksResponse;
		const linkItems = Object.values(payload.links ?? {});
		const paths = new Set<string>();

		for (const link of linkItems) {
			if (link.is_folder || link.published === false || !link.slug) {
				continue;
			}
			const routePath = mapLinkSlugToRoutePath(link.slug);
			if (routePath) {
				paths.add(routePath);
			}
		}

		return [...paths].sort((left, right) => {
			if (left === '/') return -1;
			if (right === '/') return 1;
			return left.localeCompare(right);
		});
	} catch {
		return [];
	}
}
