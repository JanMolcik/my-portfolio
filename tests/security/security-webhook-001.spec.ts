import { readFile } from 'node:fs/promises';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const revalidatePathMock = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({
	revalidatePath: revalidatePathMock,
}));

import {
	POST,
	resetWebhookIdempotencyStateForTests,
} from '@/app/api/revalidate/storyblok/route';

const WEBHOOK_SECRET = 'test-webhook-secret-abc123';

function makeRequest(
	url: string,
	headers: Record<string, string>,
	body: object,
): Request {
	return new Request(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body),
	});
}

function basePayload(storyId: string, extra: object = {}): object {
	return {
		action: 'publish',
		story: {
			id: storyId,
			published_at: '2024-06-01T12:00:00Z',
			full_slug: 'projects/test-project',
		},
		...extra,
	};
}

describe('SEC-WEBHOOK-001: Webhook secret multi-source validation', () => {
	const originalSecret = process.env.STORYBLOK_WEBHOOK_SECRET;

	beforeEach(() => {
		process.env.STORYBLOK_WEBHOOK_SECRET = WEBHOOK_SECRET;
		resetWebhookIdempotencyStateForTests();
		revalidatePathMock.mockReset();
	});

	afterAll(() => {
		if (originalSecret !== undefined) {
			process.env.STORYBLOK_WEBHOOK_SECRET = originalSecret;
		} else {
			delete process.env.STORYBLOK_WEBHOOK_SECRET;
		}
	});

	// Source 1: query param ?secret=
	it('accepts secret from query param', async () => {
		const request = makeRequest(
			`https://example.com/api/revalidate/storyblok?secret=${WEBHOOK_SECRET}`,
			{},
			basePayload('20001'),
		);
		const response = await POST(request);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ revalidated: true });
	});

	// Source 2: webhook-token header
	it('accepts secret from webhook-token header', async () => {
		const request = makeRequest(
			'https://example.com/api/revalidate/storyblok',
			{ 'webhook-token': WEBHOOK_SECRET },
			basePayload('20002'),
		);
		const response = await POST(request);
		expect(response.status).toBe(200);
	});

	// Source 3: x-webhook-token header
	it('accepts secret from x-webhook-token header', async () => {
		const request = makeRequest(
			'https://example.com/api/revalidate/storyblok',
			{ 'x-webhook-token': WEBHOOK_SECRET },
			basePayload('20003'),
		);
		const response = await POST(request);
		expect(response.status).toBe(200);
	});

	// Source 4: x-storyblok-token header
	it('accepts secret from x-storyblok-token header', async () => {
		const request = makeRequest(
			'https://example.com/api/revalidate/storyblok',
			{ 'x-storyblok-token': WEBHOOK_SECRET },
			basePayload('20004'),
		);
		const response = await POST(request);
		expect(response.status).toBe(200);
	});

	// Source 5: authorization header with Bearer prefix
	it('accepts secret from authorization Bearer header', async () => {
		const request = makeRequest(
			'https://example.com/api/revalidate/storyblok',
			{ authorization: `Bearer ${WEBHOOK_SECRET}` },
			basePayload('20005'),
		);
		const response = await POST(request);
		expect(response.status).toBe(200);
	});

	// Source 6: body field `secret`
	it('accepts secret from body field', async () => {
		const request = makeRequest(
			'https://example.com/api/revalidate/storyblok',
			{},
			basePayload('20006', { secret: WEBHOOK_SECRET }),
		);
		const response = await POST(request);
		expect(response.status).toBe(200);
	});

	// Invalid secret → 401
	it('rejects request with wrong secret with 401', async () => {
		const request = makeRequest(
			'https://example.com/api/revalidate/storyblok?secret=wrong-secret',
			{},
			basePayload('20007'),
		);
		const response = await POST(request);
		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toMatchObject({
			error: 'Unauthorized',
		});
	});

	// No secret → 401
	it('rejects request with no secret with 401', async () => {
		const request = makeRequest(
			'https://example.com/api/revalidate/storyblok',
			{},
			basePayload('20008'),
		);
		const response = await POST(request);
		expect(response.status).toBe(401);
	});

	// Timing-safe comparison: verified via source inspection
	it('uses timing-safe comparison (timingSafeEqual) for secret validation', async () => {
		const previewLib = await readFile('src/lib/security/preview.ts', 'utf8');
		// Both sides are hashed with SHA-256 before comparison to equalise buffer length,
		// preventing length-based timing differences that could leak secret length.
		expect(previewLib).toContain('timingSafeEqual');
		expect(previewLib).toContain('createHash');
		expect(previewLib).toContain("'sha256'");
	});
});
