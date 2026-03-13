import type { HomePageModel } from '@/lib/storyblok/home-page';
import type { ProjectDomain, WritingDomain } from '@/lib/storyblok/mappers';

type JsonLdNode = Record<string, unknown>;

function normalizeSiteUrl(rawUrl?: string): string {
	const fallback = 'http://localhost:3000';
	if (!rawUrl) return fallback;
	return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
}

function normalizePath(path: string): string {
	if (!path) return '/';
	return path.startsWith('/') ? path : `/${path}`;
}

function asCanonicalUrl(path: string, canonicalOverride?: string): string {
	const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
	const override = canonicalOverride?.trim();

	if (override) {
		if (override.startsWith('http://') || override.startsWith('https://')) {
			return override;
		}
		if (override.startsWith('/')) {
			return `${siteUrl}${override}`;
		}
	}

	const normalizedPath = normalizePath(path);
	return normalizedPath === '/' ? `${siteUrl}/` : `${siteUrl}${normalizedPath}`;
}

function asIsoDate(value: string): string | undefined {
	if (!value) {
		return undefined;
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return undefined;
	}
	return parsed.toISOString();
}

function compactJsonLd(value: JsonLdNode): JsonLdNode {
	return Object.fromEntries(
		Object.entries(value).filter(([, entry]) => {
			if (entry === undefined) {
				return false;
			}
			if (Array.isArray(entry) && entry.length === 0) {
				return false;
			}
			return true;
		}),
	);
}

export function serializeJsonLd(value: JsonLdNode): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildHomeJsonLd(model: HomePageModel): JsonLdNode {
	const sameAs = [...new Set(model.socialLinks.map((item) => item.url))].filter(
		(url) => url.trim().length > 0,
	);
	const knowsAbout = [...new Set(model.skills)].filter(
		(skill) => skill.trim().length > 0,
	);

	return compactJsonLd({
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: model.headline || 'Portfolio',
		jobTitle: model.role || undefined,
		url: asCanonicalUrl('/'),
		sameAs: sameAs.length > 0 ? sameAs : undefined,
		knowsAbout: knowsAbout.length > 0 ? knowsAbout : undefined,
	});
}

export function buildProjectJsonLd(project: ProjectDomain): JsonLdNode {
	const slug = project.slug || 'project';
	const canonicalUrl = asCanonicalUrl(
		`/projects/${slug}`,
		project.seo.canonicalUrl,
	);
	const sameAs = [project.projectUrl, project.repositoryUrl].filter(
		(url): url is string => Boolean(url && url.trim().length > 0),
	);

	return compactJsonLd({
		'@context': 'https://schema.org',
		'@type': 'CreativeWork',
		name: project.title || slug,
		description: project.seo.metaDescription || project.summary || undefined,
		url: canonicalUrl,
		mainEntityOfPage: canonicalUrl,
		datePublished: asIsoDate(project.publishedDate),
		image: project.logoUrl,
		genre: project.type || undefined,
		sameAs: sameAs.length > 0 ? sameAs : undefined,
	});
}

export function buildWritingJsonLd(writing: WritingDomain): JsonLdNode {
	const slug = writing.slug || 'entry';
	const canonicalUrl = asCanonicalUrl(
		`/writing/${slug}`,
		writing.seo.canonicalUrl,
	);

	return compactJsonLd({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: writing.title || slug,
		description: writing.seo.metaDescription || writing.excerpt || undefined,
		url: canonicalUrl,
		mainEntityOfPage: canonicalUrl,
		datePublished: asIsoDate(writing.publishedDate),
		image: writing.coverImageUrl,
		keywords: writing.tags.length > 0 ? writing.tags : undefined,
	});
}
