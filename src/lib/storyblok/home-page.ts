import type {
	StoryblokResolvedRelationStory,
	StoryblokStory,
} from '@/lib/storyblok/content';
import {
	mapExperienceDtoToDomain,
	mapHomeDtoToDomain,
	mapProjectDtoToDomain,
	type ExperienceDomain,
	type ProjectDomain,
	type RichTextDomain,
} from '@/lib/storyblok/mappers';

export type HomePageModel = {
	headline: string;
	role: string;
	heroParagraphs: string[];
	aboutParagraphs: string[];
	profileImageUrl?: string;
	contactIntro: string;
	contactStatus: string;
	contactTimezone: string;
	contactResponseTime: string;
	socialLinks: Array<{
		name: string;
		url: string;
		icon: string;
	}>;
	projects: ProjectDomain[];
	experience: ExperienceDomain[];
};

function asRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function extractText(value: unknown): string {
	if (!value) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (Array.isArray(value)) {
		return value
			.map((item) => extractText(item))
			.join(' ')
			.trim();
	}
	const source = asRecord(value);
	if (typeof source.text === 'string') {
		return source.text;
	}
	return extractText(source.content);
}

export function richTextToParagraphs(value: RichTextDomain): string[] {
	const paragraphs = value.content ?? [];
	return paragraphs
		.map((item) => extractText(item).replace(/\s+/g, ' ').trim())
		.filter((item) => item.length > 0);
}

function getContentComponent(story: StoryblokResolvedRelationStory): string {
	return asString(asRecord(story.content).component) ?? '';
}

function getRelationKeys(story: StoryblokResolvedRelationStory): string[] {
	const content = asRecord(story.content);
	const fullSlug = asString(story.full_slug);
	const slug = asString(story.slug);
	const keys = [
		asString(story.uuid),
		typeof story.id === 'number' ? String(story.id) : undefined,
		fullSlug,
		slug,
		asString(content.slug),
		asString(content.relation_key),
		asString(content.source_entry_id),
	];
	return [...new Set(keys.filter((item): item is string => Boolean(item)))];
}

function orderRelationsByRefs<T>(
	items: Array<{ keys: string[]; value: T }>,
	refs: string[],
): T[] {
	if (refs.length === 0) {
		return items.map((item) => item.value);
	}

	const byKey = new Map<string, T>();
	for (const item of items) {
		for (const key of item.keys) {
			if (!byKey.has(key)) {
				byKey.set(key, item.value);
			}
		}
	}

	const ordered: T[] = [];
	for (const ref of refs) {
		const item = byKey.get(ref);
		if (item && !ordered.includes(item)) {
			ordered.push(item);
		}
	}

	for (const item of items) {
		if (!ordered.includes(item.value)) {
			ordered.push(item.value);
		}
	}

	return ordered;
}

function sortProjectsByPortfolioPriority(
	projects: ProjectDomain[],
): ProjectDomain[] {
	return [...projects].sort((left, right) => {
		const leftPriority = left.portfolioPriority ?? Number.MAX_SAFE_INTEGER;
		const rightPriority = right.portfolioPriority ?? Number.MAX_SAFE_INTEGER;
		if (leftPriority !== rightPriority) {
			return leftPriority - rightPriority;
		}
		return 0;
	});
}

function getFallbackSlug(story: StoryblokResolvedRelationStory): string {
	if (typeof story.slug === 'string' && story.slug.trim().length > 0) {
		return story.slug;
	}
	if (
		typeof story.full_slug === 'string' &&
		story.full_slug.trim().length > 0
	) {
		return story.full_slug.replace(/^projects\//, '');
	}
	return '';
}

export function buildHomePageModel(
	story: StoryblokStory,
	rels: StoryblokResolvedRelationStory[],
): HomePageModel {
	const home = mapHomeDtoToDomain(story.content);

	const projects = rels
		.filter((item) => getContentComponent(item) === 'page_project')
		.map((item) => ({
			keys: getRelationKeys(item),
			value: mapProjectDtoToDomain(item.content, getFallbackSlug(item)),
		}));

	const experience = rels
		.filter((item) => getContentComponent(item) === 'item_experience')
		.map((item) => ({
			keys: getRelationKeys(item),
			value: mapExperienceDtoToDomain(item.content),
		}));

	return {
		headline: home.headline || story.name || 'Portfolio',
		role: home.role || 'Frontend Developer',
		heroParagraphs: richTextToParagraphs(home.heroIntro),
		aboutParagraphs: richTextToParagraphs(home.aboutIntro),
		profileImageUrl: home.profileImageUrl,
		contactIntro: home.availabilityNote,
		contactStatus: home.availabilityStatus,
		contactTimezone: home.availabilityTimezone,
		contactResponseTime: home.availabilityResponseTime,
		socialLinks: home.socialLinks,
		projects: sortProjectsByPortfolioPriority(
			orderRelationsByRefs(projects, home.featuredProjectRefs),
		),
		experience: orderRelationsByRefs(experience, home.experienceRefs),
	};
}
