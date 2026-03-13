import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/monitoring/logger';
import { isValidPreviewSecret } from '@/lib/security/preview';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const ALLOWED_EVENT_PATTERNS = ['publish', 'unpublish', 'delete'] as const;
const STORY_ROUTE_PREFIXES = ['projects/', 'writing/'] as const;
const WEBHOOK_SIGNATURE_STORE_LIMIT = 512;
const processedWebhookSignatures = new Set<string>();
const processedWebhookSignatureOrder: string[] = [];

type WebhookDecision = 'accepted' | 'rejected' | 'ignored';

type StoryblokWebhookPayload = {
	action?: string;
	event?: string;
	story_id?: string | number;
	published_at?: string;
	story?: {
		id?: string | number;
		published_at?: string;
		full_slug?: string;
		slug?: string;
	};
	full_slug?: string;
	slug?: string;
};

function logWebhookDecision(
	decision: WebhookDecision,
	reason: string,
	metadata?: Record<string, string | number | boolean | null>,
) {
	console.info(
		JSON.stringify({
			event: 'storyblok_revalidate',
			route: '/api/revalidate/storyblok',
			decision,
			reason,
			metadata: metadata ?? {},
		}),
	);
}

function getProvidedSecret(
	request: Request,
	payload: StoryblokWebhookPayload,
): string | null {
	const requestUrl = new URL(request.url);
	return (
		requestUrl.searchParams.get('secret') ??
		request.headers.get('webhook-token') ??
		request.headers.get('x-webhook-token') ??
		request.headers.get('x-storyblok-token') ??
		request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
		(typeof (payload as { secret?: unknown }).secret === 'string'
			? ((payload as { secret?: string }).secret ?? null)
			: null)
	);
}

function normalizeEventType(rawEventType: string | null): string | null {
	if (!rawEventType) {
		return null;
	}

	const normalized = rawEventType.trim().toLowerCase();
	if (normalized.length === 0) {
		return null;
	}

	if (normalized.includes('unpublish')) {
		return 'unpublish';
	}
	if (normalized.includes('delete')) {
		return 'delete';
	}
	if (normalized.includes('publish')) {
		return 'publish';
	}

	return null;
}

function resolveWebhookEvent(
	request: Request,
	payload: StoryblokWebhookPayload,
): string | null {
	const candidates = [
		payload.action,
		payload.event,
		request.headers.get('x-storyblok-event'),
		request.headers.get('x-webhook-event'),
		request.headers.get('webhook-event'),
	];

	for (const candidate of candidates) {
		const normalized = normalizeEventType(candidate ?? null);
		if (normalized) {
			return normalized;
		}
	}

	return null;
}

function normalizeStorySlug(rawSlug: string | null): string | null {
	if (!rawSlug) {
		return null;
	}
	const normalized = rawSlug.trim().replace(/^\/+|\/+$/g, '');
	if (normalized.length === 0) {
		return null;
	}
	return normalized;
}

function resolveStorySlug(payload: StoryblokWebhookPayload): string | null {
	const rawSlug =
		payload.story?.full_slug ??
		payload.full_slug ??
		payload.story?.slug ??
		payload.slug ??
		null;

	return normalizeStorySlug(rawSlug);
}

function normalizeStoryId(rawStoryId: string | number | null): string | null {
	if (rawStoryId === null) {
		return null;
	}

	const normalized = String(rawStoryId).trim();
	if (normalized.length === 0) {
		return null;
	}

	return normalized;
}

function resolveStoryId(payload: StoryblokWebhookPayload): string | null {
	return normalizeStoryId(payload.story?.id ?? payload.story_id ?? null);
}

function normalizePublishedAt(rawPublishedAt: string | null): string | null {
	if (!rawPublishedAt) {
		return null;
	}

	const normalized = rawPublishedAt.trim();
	if (normalized.length === 0) {
		return null;
	}

	return normalized;
}

function resolvePublishedAt(payload: StoryblokWebhookPayload): string | null {
	return normalizePublishedAt(
		payload.story?.published_at ?? payload.published_at ?? null,
	);
}

function buildWebhookSignature(
	storyId: string,
	eventType: string,
	publishedAt: string,
): string {
	return `${storyId}:${eventType}:${publishedAt}`;
}

function hasProcessedWebhookSignature(signature: string): boolean {
	return processedWebhookSignatures.has(signature);
}

function markWebhookSignatureProcessed(signature: string) {
	if (processedWebhookSignatures.has(signature)) {
		return;
	}

	processedWebhookSignatures.add(signature);
	processedWebhookSignatureOrder.push(signature);

	if (processedWebhookSignatureOrder.length > WEBHOOK_SIGNATURE_STORE_LIMIT) {
		const signatureToEvict = processedWebhookSignatureOrder.shift();
		if (signatureToEvict) {
			processedWebhookSignatures.delete(signatureToEvict);
		}
	}
}

export function resetWebhookIdempotencyStateForTests() {
	processedWebhookSignatures.clear();
	processedWebhookSignatureOrder.splice(
		0,
		processedWebhookSignatureOrder.length,
	);
}

function getRouteScopeForSlug(storySlug: string): string[] {
	if (storySlug === 'home') {
		return ['/', '/sitemap.xml'];
	}

	if (storySlug.startsWith(STORY_ROUTE_PREFIXES[0])) {
		const detailSlug = storySlug.slice(STORY_ROUTE_PREFIXES[0].length);
		if (detailSlug.length > 0 && !detailSlug.includes('/')) {
			return [`/projects/${detailSlug}`, '/', '/sitemap.xml'];
		}
	}

	if (storySlug.startsWith(STORY_ROUTE_PREFIXES[1])) {
		const detailSlug = storySlug.slice(STORY_ROUTE_PREFIXES[1].length);
		if (detailSlug.length > 0 && !detailSlug.includes('/')) {
			return [`/writing/${detailSlug}`, '/sitemap.xml'];
		}
	}

	return ['/sitemap.xml'];
}

export async function POST(request: Request) {
	let payload: StoryblokWebhookPayload = {};
	try {
		payload = (await request.json()) as StoryblokWebhookPayload;
	} catch {
		logWebhookDecision('rejected', 'invalid_payload');
		return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
	}

	try {
		const providedSecret = getProvidedSecret(request, payload);
		if (
			!isValidPreviewSecret(
				providedSecret,
				process.env.STORYBLOK_WEBHOOK_SECRET,
			)
		) {
			logWebhookDecision('rejected', 'invalid_secret');
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const normalizedEvent = resolveWebhookEvent(request, payload);
		if (
			!normalizedEvent ||
			!ALLOWED_EVENT_PATTERNS.some((event) => event === normalizedEvent)
		) {
			logWebhookDecision('ignored', 'unsupported_event', {
				action: payload.action ?? null,
				event: payload.event ?? null,
			});
			return NextResponse.json(
				{ ignored: true, reason: 'unsupported_event' },
				{ status: 202 },
			);
		}

		const storySlug = resolveStorySlug(payload);
		if (!storySlug) {
			logWebhookDecision('ignored', 'missing_story_slug');
			return NextResponse.json(
				{ ignored: true, reason: 'missing_story_slug' },
				{ status: 202 },
			);
		}

		const storyId = resolveStoryId(payload);
		const publishedAt = resolvePublishedAt(payload);
		if (!storyId || !publishedAt) {
			logWebhookDecision('ignored', 'missing_idempotency_signature', {
				storySlug,
				storyId,
				publishedAt,
				event: normalizedEvent,
			});
			return NextResponse.json(
				{ ignored: true, reason: 'missing_idempotency_signature' },
				{ status: 202 },
			);
		}

		const signature = buildWebhookSignature(
			storyId,
			normalizedEvent,
			publishedAt,
		);
		if (hasProcessedWebhookSignature(signature)) {
			logWebhookDecision('ignored', 'duplicate_signature', {
				signature,
				storySlug,
				event: normalizedEvent,
			});
			return NextResponse.json(
				{
					ignored: true,
					reason: 'duplicate_signature',
				},
				{ status: 202 },
			);
		}

		const scopePaths = getRouteScopeForSlug(storySlug);
		for (const scopePath of scopePaths) {
			revalidatePath(scopePath);
		}
		markWebhookSignatureProcessed(signature);

		logWebhookDecision('accepted', 'revalidated', {
			storySlug,
			signature,
			storyId,
			publishedAt,
			event: normalizedEvent,
			scopeCount: scopePaths.length,
			scope: scopePaths.join(','),
		});

		return NextResponse.json({
			revalidated: true,
			event: normalizedEvent,
			storySlug,
			scope: scopePaths,
		});
	} catch (error) {
		logServerError('storyblok_revalidate_failed', error, {
			route: '/api/revalidate/storyblok',
		});
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 },
		);
	}
}
