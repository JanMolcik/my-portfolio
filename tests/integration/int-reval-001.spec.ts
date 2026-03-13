import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({
	revalidatePath: revalidatePathMock,
}));

import {
	POST as revalidateWebhook,
	resetWebhookIdempotencyStateForTests,
} from '@/app/api/revalidate/storyblok/route';

describe('INT-REVAL-001', () => {
	const originalWebhookSecret = process.env.STORYBLOK_WEBHOOK_SECRET;

	beforeEach(() => {
		revalidatePathMock.mockReset();
		resetWebhookIdempotencyStateForTests();
		process.env.STORYBLOK_WEBHOOK_SECRET = 'webhook-secret';
	});

	it('revalidates minimal route scope for project publish events', async () => {
		const response = await revalidateWebhook(
			new Request(
				'https://example.com/api/revalidate/storyblok?secret=webhook-secret',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						action: 'published',
						story: {
							id: 'project-100',
							published_at: '2026-03-05T13:40:00.000Z',
							full_slug: 'projects/alpha',
						},
					}),
				},
			),
		);

		expect(response.status).toBe(200);
		expect(revalidatePathMock).toHaveBeenCalledTimes(3);
		expect(revalidatePathMock).toHaveBeenNthCalledWith(1, '/projects/alpha');
		expect(revalidatePathMock).toHaveBeenNthCalledWith(2, '/');
		expect(revalidatePathMock).toHaveBeenNthCalledWith(3, '/sitemap.xml');
	});

	it('revalidates minimal route scope for writing delete events', async () => {
		const response = await revalidateWebhook(
			new Request(
				'https://example.com/api/revalidate/storyblok?secret=webhook-secret',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						action: 'deleted',
						story: {
							id: 'writing-100',
							published_at: '2026-03-05T13:41:00.000Z',
							full_slug: 'writing/hello-world',
						},
					}),
				},
			),
		);

		expect(response.status).toBe(200);
		expect(revalidatePathMock).toHaveBeenCalledTimes(2);
		expect(revalidatePathMock).toHaveBeenNthCalledWith(
			1,
			'/writing/hello-world',
		);
		expect(revalidatePathMock).toHaveBeenNthCalledWith(2, '/sitemap.xml');
	});

	it('revalidates only home and sitemap for home story updates', async () => {
		const response = await revalidateWebhook(
			new Request(
				'https://example.com/api/revalidate/storyblok?secret=webhook-secret',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						event: 'story.published',
						story: {
							id: 'home-100',
							published_at: '2026-03-05T13:42:00.000Z',
							full_slug: 'home',
						},
					}),
				},
			),
		);

		expect(response.status).toBe(200);
		expect(revalidatePathMock).toHaveBeenCalledTimes(2);
		expect(revalidatePathMock).toHaveBeenNthCalledWith(1, '/');
		expect(revalidatePathMock).toHaveBeenNthCalledWith(2, '/sitemap.xml');
	});

	it('ignores events missing idempotency signature fields', async () => {
		const response = await revalidateWebhook(
			new Request(
				'https://example.com/api/revalidate/storyblok?secret=webhook-secret',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						event: 'story.published',
						story: { full_slug: 'projects/alpha' },
					}),
				},
			),
		);

		expect(response.status).toBe(202);
		expect(revalidatePathMock).not.toHaveBeenCalled();
		await expect(response.json()).resolves.toMatchObject({
			ignored: true,
			reason: 'missing_idempotency_signature',
		});
	});

	afterAll(() => {
		if (originalWebhookSecret) {
			process.env.STORYBLOK_WEBHOOK_SECRET = originalWebhookSecret;
		} else {
			delete process.env.STORYBLOK_WEBHOOK_SECRET;
		}
	});
});
