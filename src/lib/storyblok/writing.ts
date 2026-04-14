import { z } from 'zod';
import { getStoryblokApi } from './client';
import {
	type StoryblokRequestParams,
	type StoryblokStory,
	getStoryblokRequestParamsByMode,
} from './content';
import {
	STORYBLOK_PUBLISHED_VERSION,
	STORYBLOK_STORIES_ENDPOINT,
	STORYBLOK_WRITING_PAGE_SIZE,
	STORYBLOK_WRITING_SORT,
	type StoryblokContentMode,
	getPublishedStoryParams,
} from './queries';
import { mapWritingDtoToDomain, type WritingDomain } from './mappers';

export type WritingListItem = Pick<
	WritingDomain,
	| 'title'
	| 'slug'
	| 'excerpt'
	| 'publishedDate'
	| 'updatedDate'
	| 'coverImageUrl'
	| 'coverImageAlt'
	| 'tags'
	| 'sourceType'
	| 'sourceUrl'
	| 'sourceTitle'
	| 'contentOrigin'
	| 'language'
	| 'readingTimeMinutes'
	| 'featured'
>;

export type WritingListResult = {
	items: WritingListItem[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
};

export type PublishedWritingListOptions = {
	page?: number;
	perPage?: number;
	mode?: StoryblokContentMode;
};

const writingStoryListItemSchema = z
	.object({
		full_slug: z.string().optional(),
		slug: z.string().optional(),
		content: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

const writingStoryListResponseSchema = z.object({
	stories: z.array(writingStoryListItemSchema).optional(),
});

type StoryblokWritingListResponse = {
	stories?: Array<Pick<StoryblokStory, 'full_slug' | 'slug' | 'content'>>;
};

function normalizePage(value: number | undefined): number {
	return Number.isInteger(value) && value && value > 0 ? value : 1;
}

function normalizePerPage(value: number | undefined): number {
	if (!Number.isInteger(value) || !value || value <= 0) {
		return STORYBLOK_WRITING_PAGE_SIZE;
	}
	return Math.min(value, 100);
}

function getHeaderValue(
	headers: unknown,
	name: 'total' | 'per-page',
): string | number | undefined {
	if (!headers || typeof headers !== 'object') {
		return undefined;
	}
	const source = headers as Record<string, unknown>;
	const direct = source[name] ?? source[name.toUpperCase()];
	if (typeof direct === 'string' || typeof direct === 'number') {
		return direct;
	}
	const getter = source.get;
	if (typeof getter === 'function') {
		const value = getter.call(headers, name);
		if (typeof value === 'string' || typeof value === 'number') {
			return value;
		}
	}
	return undefined;
}

function toNonNegativeNumber(value: unknown, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getFallbackSlug(story: Pick<StoryblokStory, 'full_slug' | 'slug'>) {
	if (
		typeof story.full_slug === 'string' &&
		story.full_slug.startsWith('writing/')
	) {
		return story.full_slug.slice('writing/'.length);
	}
	return typeof story.slug === 'string' ? story.slug : '';
}

function toWritingListItem(
	story: Pick<StoryblokStory, 'full_slug' | 'slug' | 'content'>,
): WritingListItem {
	const writing = mapWritingDtoToDomain(story.content, getFallbackSlug(story));
	return {
		title: writing.title,
		slug: writing.slug,
		excerpt: writing.excerpt,
		publishedDate: writing.publishedDate,
		updatedDate: writing.updatedDate,
		coverImageUrl: writing.coverImageUrl,
		coverImageAlt: writing.coverImageAlt,
		tags: writing.tags,
		sourceType: writing.sourceType,
		sourceUrl: writing.sourceUrl,
		sourceTitle: writing.sourceTitle,
		contentOrigin: writing.contentOrigin,
		language: writing.language,
		readingTimeMinutes: writing.readingTimeMinutes,
		featured: writing.featured,
	};
}

function getWritingListParams(
	page: number,
	perPage: number,
): StoryblokRequestParams {
	return {
		...getPublishedStoryParams(),
		starts_with: 'writing/',
		content_type: 'page_writing',
		page,
		per_page: perPage,
		sort_by: STORYBLOK_WRITING_SORT,
		excluding_fields: 'content',
	};
}

export async function getPublishedWritingList({
	page,
	perPage,
	mode = STORYBLOK_PUBLISHED_VERSION,
}: PublishedWritingListOptions = {}): Promise<WritingListResult> {
	const normalizedPage = normalizePage(page);
	const normalizedPerPage = normalizePerPage(perPage);
	const params = getStoryblokRequestParamsByMode(
		getWritingListParams(normalizedPage, normalizedPerPage),
		mode,
	);
	const empty = {
		items: [],
		total: 0,
		page: normalizedPage,
		perPage: normalizedPerPage,
		totalPages: 0,
	};
	if (!params) {
		return empty;
	}

	const storyblokApi = getStoryblokApi();
	try {
		const response = await storyblokApi.get(STORYBLOK_STORIES_ENDPOINT, params);
		const payload = writingStoryListResponseSchema.parse(
			response.data,
		) as StoryblokWritingListResponse;
		const stories = payload.stories ?? [];
		const total = toNonNegativeNumber(
			getHeaderValue(response.headers, 'total') ?? stories.length,
			stories.length,
		);
		const responsePerPage = toNonNegativeNumber(
			getHeaderValue(response.headers, 'per-page'),
			normalizedPerPage,
		);
		return {
			items: stories.map(toWritingListItem),
			total,
			page: normalizedPage,
			perPage: responsePerPage,
			totalPages: total > 0 ? Math.ceil(total / responsePerPage) : 0,
		};
	} catch {
		return empty;
	}
}

export async function getPublishedWritingPageParams(): Promise<
	Array<{ page: string }>
> {
	const firstPage = await getPublishedWritingList();
	return Array.from(
		{ length: Math.max(firstPage.totalPages - 1, 0) },
		(_, index) => ({
			page: String(index + 2),
		}),
	);
}
