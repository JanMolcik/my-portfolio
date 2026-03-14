import type { MetadataRoute } from 'next';
import { getAbsoluteSiteUrl } from '@/lib/seo/site-url';
import { getPublishedSitemapPaths } from '@/lib/storyblok/content';

export const revalidate = 86400;
export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const paths = await getPublishedSitemapPaths();
	const routePaths = paths.length > 0 ? paths : ['/'];

	return routePaths.map((path) => ({
		url: getAbsoluteSiteUrl(path),
	}));
}
