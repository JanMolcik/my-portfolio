import type { MetadataRoute } from 'next';
import { getAbsoluteSiteUrl } from '@/lib/seo/site-url';
import { getPublishedSitemapPaths } from '@/lib/storyblok/content';
import { getPublishedWritingList } from '@/lib/storyblok/writing';

export const revalidate = 86400;
export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [paths, writingList] = await Promise.all([
		getPublishedSitemapPaths(),
		getPublishedWritingList({ page: 1 }),
	]);
	const routePaths = new Set(paths.length > 0 ? paths : ['/']);
	routePaths.add('/writing');
	for (let page = 2; page <= writingList.totalPages; page += 1) {
		routePaths.add(`/writing/page/${page}`);
	}

	return [...routePaths].sort().map((path) => ({
		url: getAbsoluteSiteUrl(path),
	}));
}
