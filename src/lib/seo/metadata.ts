import type { Metadata } from 'next';
import type { StoryblokStory } from '@/lib/storyblok/content';
import { mapSeoDtoToDomain } from '@/lib/storyblok/mappers';

function normalizeSiteUrl(rawUrl?: string): string {
	const fallback = 'http://localhost:3000';
	if (!rawUrl) return fallback;
	return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
}

function normalizePath(path: string): string {
	if (!path) return '/';
	return path.startsWith('/') ? path : `/${path}`;
}

function routeMetadataLabel(
	path: string,
): 'Home' | 'Project' | 'Writing' | 'Page' {
	if (path === '/') return 'Home';
	if (path.startsWith('/projects/')) return 'Project';
	if (path.startsWith('/writing/')) return 'Writing';
	return 'Page';
}

export function buildNotFoundMetadata(titlePrefix: string): Metadata {
	return {
		title: `${titlePrefix} Not Found`,
		robots: {
			index: false,
			follow: false,
		},
	};
}

export type OpenGraphType = 'website' | 'article';

export function buildStoryMetadata(
	story: StoryblokStory,
	path: string,
	ogType: OpenGraphType = 'website',
): Metadata {
	const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
	const normalizedPath = normalizePath(path);
	const label = routeMetadataLabel(normalizedPath);
	const storyName = story.name?.trim() || 'Portfolio';
	const seo = mapSeoDtoToDomain(story.content?.seo);
	const canonicalUrl = seo.canonicalUrl || `${siteUrl}${normalizedPath}`;
	const title = seo.metaTitle || `${storyName} | ${label}`;
	const description = seo.metaDescription || `${label} page for ${storyName}.`;
	const ogImage = seo.ogImageUrl || `${siteUrl}/favicon.ico`;
	const isNoIndex = seo.noindex;

	return {
		title,
		description,
		alternates: {
			canonical: canonicalUrl,
		},
		openGraph: {
			title,
			description,
			url: canonicalUrl,
			type: ogType,
			images: [{ url: ogImage }],
		},
		robots: {
			index: !isNoIndex,
			follow: !isNoIndex,
		},
	};
}
