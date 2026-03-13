import { createHash, timingSafeEqual } from 'node:crypto';

const INTERNAL_PREVIEW_ORIGIN = 'https://preview.internal';

function hasExternalScheme(value: string): boolean {
	return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
}

function stripTemplatePlaceholders(value: string): string {
	return value
		.replace(/\{\{[^{}]+\}\}/g, '')
		.replace(/\{[^{}]+\}/g, '')
		.trim();
}

function normalizePreviewPath(value: string): string {
	const trimmed = value.trim();
	if (trimmed === 'home' || trimmed === '/home') {
		return '/';
	}

	return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function mapToSupportedPreviewRoute(parsed: URL): string {
	const pathname = parsed.pathname;
	const search = parsed.search;
	const hash = parsed.hash;

	if (pathname === '/') {
		return `/${search}${hash}`;
	}

	if (pathname === '/home') {
		return `/${search}${hash}`;
	}

	if (/^\/projects\/[^/]+$/.test(pathname)) {
		return `${pathname}${search}${hash}`;
	}

	if (/^\/writing\/[^/]+$/.test(pathname)) {
		return `${pathname}${search}${hash}`;
	}

	if (pathname === '/projects') {
		return '/#projects';
	}

	if (pathname === '/experience' || pathname.startsWith('/experience/')) {
		return '/#experience';
	}

	return '/';
}

export function isValidPreviewSecret(
	providedSecret: string | null,
	expectedSecret: string | undefined,
): boolean {
	if (!providedSecret || !expectedSecret) {
		return false;
	}

	const providedDigest = createHash('sha256').update(providedSecret).digest();
	const expectedDigest = createHash('sha256').update(expectedSecret).digest();

	return timingSafeEqual(providedDigest, expectedDigest);
}

export function getSafePreviewRedirectPath(
	pathParam: string | null,
	slugParam: string | null,
): string | null {
	const rawCandidate = pathParam ?? slugParam;
	const cleanedCandidate = rawCandidate
		? stripTemplatePlaceholders(rawCandidate)
		: null;

	if (!cleanedCandidate || cleanedCandidate.length === 0) {
		return '/';
	}

	if (
		cleanedCandidate.startsWith('//') ||
		hasExternalScheme(cleanedCandidate)
	) {
		return null;
	}

	const normalizedPath = normalizePreviewPath(cleanedCandidate);
	if (normalizedPath.includes('\\')) {
		return null;
	}

	let parsed: URL;
	try {
		parsed = new URL(normalizedPath, INTERNAL_PREVIEW_ORIGIN);
	} catch {
		return null;
	}

	if (parsed.origin !== INTERNAL_PREVIEW_ORIGIN) {
		return null;
	}

	if (parsed.pathname.split('/').includes('..')) {
		return null;
	}

	const safePath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
	if (!safePath.startsWith('/') || safePath.startsWith('//')) {
		return null;
	}

	return mapToSupportedPreviewRoute(parsed);
}
