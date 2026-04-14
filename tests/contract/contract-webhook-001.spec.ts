import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const revalidatePathMock = vi.hoisted(() => vi.fn());
const consoleInfoMock = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({
	revalidatePath: revalidatePathMock,
}));

import {
	POST as revalidateWebhook,
	resetWebhookIdempotencyStateForTests,
} from '@/app/api/revalidate/storyblok/route';

describe('CONTRACT-WEBHOOK-001', () => {
	const originalWebhookSecret = process.env.STORYBLOK_WEBHOOK_SECRET;
	const originalConsoleInfo = console.info;

	beforeEach(() => {
		revalidatePathMock.mockReset();
		resetWebhookIdempotencyStateForTests();
		consoleInfoMock.mockReset();
		console.info = consoleInfoMock;
		process.env.STORYBLOK_WEBHOOK_SECRET = 'webhook-secret';
	});

	it('rejects webhook requests with invalid secret before revalidation', async () => {
		const response = await revalidateWebhook(
			new Request(
				'https://example.com/api/revalidate/storyblok?secret=invalid',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						action: 'published',
						story: { full_slug: 'projects/alpha' },
					}),
				},
			),
		);

		expect(response.status).toBe(401);
		expect(revalidatePathMock).not.toHaveBeenCalled();
	});

	it('accepts supported publish/unpublish/delete events', async () => {
		const events = ['story.published', 'story.unpublished', 'story.deleted'];
		for (const event of events) {
			const response = await revalidateWebhook(
				new Request(
					'https://example.com/api/revalidate/storyblok?secret=webhook-secret',
					{
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({
							event,
							story: {
								id: 'writing-1',
								published_at: '2026-03-05T13:00:00.000Z',
								full_slug: 'writing/hello-world',
							},
						}),
					},
				),
			);
			expect(response.status).toBe(200);
		}
		expect(revalidatePathMock).toHaveBeenCalledTimes(events.length * 4);
	});

	it('ignores unsupported webhook events without revalidation', async () => {
		const response = await revalidateWebhook(
			new Request(
				'https://example.com/api/revalidate/storyblok?secret=webhook-secret',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						event: 'story.moved',
						story: {
							id: 'project-1',
							published_at: '2026-03-05T13:10:00.000Z',
							full_slug: 'projects/alpha',
						},
					}),
				},
			),
		);

		expect(response.status).toBe(202);
		expect(revalidatePathMock).not.toHaveBeenCalled();
	});

	it('enforces idempotency signature and ignores duplicate/replayed events', async () => {
		const requestUrl =
			'https://example.com/api/revalidate/storyblok?secret=webhook-secret';
		const body = {
			event: 'story.published',
			story: {
				id: 'project-42',
				published_at: '2026-03-05T13:20:00.000Z',
				full_slug: 'projects/alpha',
			},
		};

		const firstResponse = await revalidateWebhook(
			new Request(requestUrl, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			}),
		);
		const secondResponse = await revalidateWebhook(
			new Request(requestUrl, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			}),
		);

		expect(firstResponse.status).toBe(200);
		expect(secondResponse.status).toBe(202);
		expect(revalidatePathMock).toHaveBeenCalledTimes(3);
		await expect(secondResponse.json()).resolves.toMatchObject({
			ignored: true,
			reason: 'duplicate_signature',
		});
	});

	it('emits structured decision logs with accepted/rejected/ignored outcomes', async () => {
		await revalidateWebhook(
			new Request(
				'https://example.com/api/revalidate/storyblok?secret=invalid',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						event: 'story.published',
						story: {
							id: 'project-7',
							published_at: '2026-03-05T13:30:00.000Z',
							full_slug: 'projects/alpha',
						},
					}),
				},
			),
		);

		await revalidateWebhook(
			new Request(
				'https://example.com/api/revalidate/storyblok?secret=webhook-secret',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						event: 'story.moved',
						story: {
							id: 'project-8',
							published_at: '2026-03-05T13:31:00.000Z',
							full_slug: 'projects/beta',
						},
					}),
				},
			),
		);

		await revalidateWebhook(
			new Request(
				'https://example.com/api/revalidate/storyblok?secret=webhook-secret',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						event: 'story.published',
						story: {
							id: 'project-9',
							published_at: '2026-03-05T13:32:00.000Z',
							full_slug: 'projects/gamma',
						},
					}),
				},
			),
		);

		const parsedLogs = consoleInfoMock.mock.calls
			.map((call) => call[0])
			.filter((entry): entry is string => typeof entry === 'string')
			.map((entry) => JSON.parse(entry) as { decision?: string });
		const decisions = parsedLogs
			.map((entry) => entry.decision)
			.filter((decision): decision is string => typeof decision === 'string');

		expect(decisions).toContain('rejected');
		expect(decisions).toContain('ignored');
		expect(decisions).toContain('accepted');
	});

	afterAll(() => {
		console.info = originalConsoleInfo;
		if (originalWebhookSecret) {
			process.env.STORYBLOK_WEBHOOK_SECRET = originalWebhookSecret;
		} else {
			delete process.env.STORYBLOK_WEBHOOK_SECRET;
		}
	});
});
