import type { MetadataRoute } from 'next';

export const revalidate = 86400;
export const dynamic = 'force-static';

function normalizeSiteUrl(rawUrl?: string): string {
	const fallback = 'http://localhost:3000';
	if (!rawUrl) {
		return fallback;
	}
	return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
}

export default function robots(): MetadataRoute.Robots {
	const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: [
					'/api/preview',
					'/api/exit-preview',
					'/api/revalidate/storyblok',
					'/api/uptime',
				],
			},
		],
		sitemap: `${siteUrl}/sitemap.xml`,
	};
}
