import type { MetadataRoute } from 'next';
import { getPublishedSitemapPaths } from '@/lib/storyblok/content';

export const revalidate = 86400;
export const dynamic = 'force-static';

function normalizeSiteUrl(rawUrl?: string): string {
	const fallback = 'http://localhost:3000';
	if (!rawUrl) {
		return fallback;
	}
	return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
	const paths = await getPublishedSitemapPaths();
	const routePaths = paths.length > 0 ? paths : ['/'];

	return routePaths.map((path) => ({
		url: `${siteUrl}${path}`,
	}));
}
