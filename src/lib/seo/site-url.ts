const LOCAL_SITE_URL = 'http://localhost:3000';

export function normalizeSiteUrl(rawUrl: string): string {
	const trimmed = rawUrl.trim();
	if (trimmed.length === 0) {
		throw new Error('NEXT_PUBLIC_SITE_URL must not be empty.');
	}

	return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function getSiteUrl(): string {
	const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
	if (typeof rawSiteUrl === 'string' && rawSiteUrl.trim().length > 0) {
		return normalizeSiteUrl(rawSiteUrl);
	}

	if (process.env.NODE_ENV === 'production') {
		throw new Error(
			'NEXT_PUBLIC_SITE_URL is required in production to generate canonical URLs and metadata.',
		);
	}

	return LOCAL_SITE_URL;
}

export function getMetadataBaseUrl(): URL {
	return new URL(`${getSiteUrl()}/`);
}

export function getAbsoluteSiteUrl(path: string): string {
	const siteUrl = getSiteUrl();
	const normalizedPath = path.length === 0 ? '/' : path;
	const pathname = normalizedPath.startsWith('/')
		? normalizedPath
		: `/${normalizedPath}`;

	return pathname === '/' ? `${siteUrl}/` : `${siteUrl}${pathname}`;
}
