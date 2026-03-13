import { expect, test, type APIRequestContext } from '@playwright/test';

type SmokeSlugs = {
	project: string | null;
	writing: string | null;
};

const LOCAL_BASE_URL = 'http://127.0.0.1:3100';

function decodeXmlEntities(value: string): string {
	return value
		.replaceAll('&amp;', '&')
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&apos;', "'");
}

function extractSitemapPaths(xml: string): string[] {
	const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
	const paths = new Set<string>();

	for (const match of matches) {
		const rawLocation = decodeXmlEntities(match[1] ?? '').trim();
		if (!rawLocation) {
			continue;
		}

		try {
			const locationUrl = new URL(rawLocation);
			paths.add(locationUrl.pathname);
		} catch {
			// Best-effort parse for malformed XML entries in non-production fixtures.
			if (rawLocation.startsWith('/')) {
				paths.add(rawLocation);
			}
		}
	}

	return [...paths];
}

function findSlugByPrefix(paths: string[], prefix: '/projects/' | '/writing/') {
	for (const path of paths) {
		if (!path.startsWith(prefix)) {
			continue;
		}

		const slug = path.slice(prefix.length);
		if (slug.length > 0 && !slug.includes('/')) {
			return slug;
		}
	}

	return null;
}

async function getSmokeSlugs(request: APIRequestContext): Promise<SmokeSlugs> {
	const sitemapResponse = await request.get('/sitemap.xml');
	if (sitemapResponse.status() !== 200) {
		return { project: null, writing: null };
	}

	const sitemapXml = await sitemapResponse.text();
	const paths = extractSitemapPaths(sitemapXml);

	return {
		project: findSlugByPrefix(paths, '/projects/'),
		writing: findSlugByPrefix(paths, '/writing/'),
	};
}

test('E2E-SMOKE-001: home route smoke', async ({ request }) => {
	const response = await request.get('/');
	expect([200, 404]).toContain(response.status());
});

test('E2E-SMOKE-001: invalid project slug resolves to not-found route', async ({
	request,
}) => {
	const response = await request.get('/projects/__missing__');
	expect(response.status()).toBe(404);
});

test('E2E-SMOKE-001: invalid writing slug resolves to not-found route', async ({
	request,
}) => {
	const response = await request.get('/writing/__missing__');
	expect(response.status()).toBe(404);
});

test('E2E-SMOKE-001: valid project slug renders when published route exists', async ({
	request,
}) => {
	const slugs = await getSmokeSlugs(request);
	test.skip(!slugs.project, 'No published project route found in sitemap.');

	const route = `/projects/${slugs.project}`;
	const response = await request.get(route);
	expect(response.status()).toBe(200);
});

test('E2E-SMOKE-001: valid writing slug renders when published route exists', async ({
	request,
}) => {
	const slugs = await getSmokeSlugs(request);
	test.skip(!slugs.writing, 'No published writing route found in sitemap.');

	const route = `/writing/${slugs.writing}`;
	const response = await request.get(route);
	expect(response.status()).toBe(200);
});

test('E2E-SMOKE-001: preview path rejects invalid secret and redirects when authorized', async ({
	request,
}) => {
	const unauthorized = await request.get(
		'/api/preview?secret=invalid&slug=home',
	);
	expect(unauthorized.status()).toBe(401);

	const previewSecret = process.env.PREVIEW_SECRET?.trim();
	test.skip(
		!previewSecret,
		'PREVIEW_SECRET is not configured in this environment.',
	);

	const authorized = await request.get(
		`/api/preview?secret=${encodeURIComponent(previewSecret ?? '')}&slug=home`,
		{
			maxRedirects: 0,
		},
	);
	expect(authorized.status()).toBe(307);

	const location = authorized.headers().location;
	expect(location).toBeTruthy();
	expect(new URL(location ?? '/', LOCAL_BASE_URL).pathname).toBe('/');
});
