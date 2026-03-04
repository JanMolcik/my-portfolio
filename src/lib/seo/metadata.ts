import type { Metadata } from 'next';
import type { StoryblokStory } from '@/lib/storyblok/content';

function normalizeSiteUrl(rawUrl?: string): string {
	const fallback = 'http://localhost:3000';
	if (!rawUrl) return fallback;
	return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
}

function resolveOgImageUrl(
	ogImage: string | { filename?: string } | undefined,
): string | undefined {
	if (!ogImage) return undefined;
	if (typeof ogImage === 'string') return ogImage;
	return ogImage.filename;
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

export function buildStoryMetadata(
	story: StoryblokStory,
	path: string,
): Metadata {
	const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
	const seo = story.content?.seo;
	const canonicalUrl = seo?.canonical_url || `${siteUrl}${path}`;
	const title = seo?.meta_title || story.name || 'Portfolio';
	const description = seo?.meta_description || `${title} page`;
	const ogImage = resolveOgImageUrl(seo?.og_image);
	const isNoIndex = seo?.noindex ?? false;

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
			type: 'website',
			images: ogImage ? [{ url: ogImage }] : undefined,
		},
		robots: {
			index: !isNoIndex,
			follow: !isNoIndex,
		},
	};
}
