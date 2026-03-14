import type { MetadataRoute } from 'next';
import { getAbsoluteSiteUrl } from '@/lib/seo/site-url';

export const revalidate = 86400;
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: [
					'/api/preview',
					'/api/exit-preview',
					'/api/revalidate/storyblok',
					'/api/contact',
					'/api/uptime',
				],
			},
		],
		sitemap: getAbsoluteSiteUrl('/sitemap.xml'),
	};
}
