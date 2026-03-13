const STORYBLOK_CACHE_KEY_PREFIX = 'storyblok';
const STORYBLOK_PAGE_KEY_PREFIX = `${STORYBLOK_CACHE_KEY_PREFIX}:page`;
const STORYBLOK_LIST_KEY_PREFIX = `${STORYBLOK_CACHE_KEY_PREFIX}:list`;

function normalizeSegment(value: string): string {
	return value.trim().replace(/^\/+|\/+$/g, '');
}

export const storyblokCacheKeys = {
	page(slug: string): `storyblok:page:${string}` {
		return `${STORYBLOK_PAGE_KEY_PREFIX}:${normalizeSegment(slug)}`;
	},
	listByPrefix(prefix: string): `storyblok:list:${string}` {
		const normalized = normalizeSegment(prefix);
		const target = normalized.replace(/\/+$/g, '') || 'root';
		return `${STORYBLOK_LIST_KEY_PREFIX}:${target}`;
	},
	listProjects: `${STORYBLOK_LIST_KEY_PREFIX}:projects` as const,
	listWriting: `${STORYBLOK_LIST_KEY_PREFIX}:writing` as const,
};
