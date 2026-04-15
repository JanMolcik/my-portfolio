import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getContactServerConfigMock = vi.hoisted(() => vi.fn());
const applyContactRateLimitMock = vi.hoisted(() => vi.fn());
const verifyTurnstileTokenMock = vi.hoisted(() => vi.fn());
const deliverContactMessageMock = vi.hoisted(() => vi.fn());
const logInfoMock = vi.hoisted(() => vi.fn());
const logServerErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/contact/config', () => ({
	getContactServerConfig: getContactServerConfigMock,
	isContactProtectionConfigured: vi.fn(
		(config: { turnstileSecretKey?: string | null }) =>
			Boolean(config.turnstileSecretKey),
	),
}));

vi.mock('@/lib/contact/rate-limit', () => ({
	applyContactRateLimit: applyContactRateLimitMock,
}));

vi.mock('@/lib/contact/turnstile', () => ({
	verifyTurnstileToken: verifyTurnstileTokenMock,
}));

vi.mock('@/lib/contact/delivery', () => ({
	deliverContactMessage: deliverContactMessageMock,
}));

vi.mock('@/lib/monitoring/logger', () => ({
	logInfo: logInfoMock,
	logServerError: logServerErrorMock,
}));

import { POST as submitContact } from '@/app/api/contact/route';

function buildRequest(
	overrides: Partial<{
		name: string;
		email: string;
		company: string;
		message: string;
		website: string;
		renderedAt: string;
		turnstileToken: string;
	}> = {},
) {
	const formData = new FormData();
	formData.set('name', overrides.name ?? 'Jan Molcik');
	formData.set('email', overrides.email ?? 'jan@example.com');
	formData.set('company', overrides.company ?? 'ABUGO');
	formData.set(
		'message',
		overrides.message ??
			'I need help with a frontend platform migration and shared Storyblok architecture.',
	);
	formData.set('website', overrides.website ?? '');
	formData.set(
		'renderedAt',
		overrides.renderedAt ?? String(Date.now() - 10_000),
	);
	formData.set(
		'cf-turnstile-response',
		overrides.turnstileToken ?? 'turnstile-token',
	);

	return new Request('https://example.com/api/contact', {
		method: 'POST',
		headers: {
			'x-forwarded-for': '203.0.113.10',
		},
		body: formData,
	});
}

describe('SEC-CONTACT-001', () => {
	beforeEach(() => {
		getContactServerConfigMock.mockReset();
		applyContactRateLimitMock.mockReset();
		verifyTurnstileTokenMock.mockReset();
		deliverContactMessageMock.mockReset();
		logInfoMock.mockReset();
		logServerErrorMock.mockReset();

		getContactServerConfigMock.mockReturnValue({
			turnstileSecretKey: 'turnstile-secret',
			resendApiKey: 'resend-key',
			contactFromEmail: 'Portfolio <portfolio@example.com>',
			contactToEmail: 'jan@example.com',
			allowsMockDelivery: false,
		});
		applyContactRateLimitMock.mockResolvedValue({
			success: true,
			limit: 4,
			remaining: 3,
			reset: Date.now() + 60_000,
			provider: 'memory',
		});
		verifyTurnstileTokenMock.mockResolvedValue({
			success: true,
			errorCodes: [],
		});
		deliverContactMessageMock.mockResolvedValue({
			mocked: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('rejects malformed submissions before touching verification or delivery', async () => {
		const request = buildRequest({
			message: 'Too short',
			turnstileToken: '',
		});

		const response = await submitContact(request);

		expect(response.status).toBe(400);
		expect(applyContactRateLimitMock).not.toHaveBeenCalled();
		expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
		expect(deliverContactMessageMock).not.toHaveBeenCalled();
	});

	it('silently absorbs honeypot submissions', async () => {
		const request = buildRequest({
			website: 'https://spam.invalid',
		});

		const response = await submitContact(request);

		expect(response.status).toBe(202);
		expect(applyContactRateLimitMock).not.toHaveBeenCalled();
		expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
		expect(deliverContactMessageMock).not.toHaveBeenCalled();
	});

	it('rejects requests when rate limit is exceeded', async () => {
		applyContactRateLimitMock.mockResolvedValueOnce({
			success: false,
			limit: 4,
			remaining: 0,
			reset: Date.now() + 60_000,
			provider: 'upstash',
		});

		const response = await submitContact(buildRequest());

		expect(response.status).toBe(429);
		expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
		expect(deliverContactMessageMock).not.toHaveBeenCalled();
	});

	it('rejects submissions when Turnstile verification fails', async () => {
		verifyTurnstileTokenMock.mockResolvedValueOnce({
			success: false,
			errorCodes: ['timeout-or-duplicate'],
		});

		const response = await submitContact(buildRequest());

		expect(response.status).toBe(400);
		expect(deliverContactMessageMock).not.toHaveBeenCalled();
	});

	it('sends validated submissions through delivery provider', async () => {
		const response = await submitContact(buildRequest());
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(applyContactRateLimitMock).toHaveBeenCalledWith('203.0.113.10');
		expect(verifyTurnstileTokenMock).toHaveBeenCalledWith({
			token: 'turnstile-token',
			secretKey: 'turnstile-secret',
			remoteIp: '203.0.113.10',
		});
		expect(deliverContactMessageMock).toHaveBeenCalledTimes(1);
		expect(payload).toMatchObject({
			ok: true,
		});
	});
});

describe('SEC-CONTACT-001: Turnstile production guard (T5)', () => {
	it('shouldUseDevelopmentFallbacks is false in production — test keys cannot activate', async () => {
		const { getContactServerConfig, getContactPublicConfig } =
			await vi.importActual<typeof import('@/lib/contact/config')>(
				'@/lib/contact/config',
			);

		const savedNodeEnv = process.env.NODE_ENV;
		const savedTurnstileKey = process.env.TURNSTILE_SECRET_KEY;
		const savedPublicKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

		try {
			(process.env as Record<string, string | undefined>).NODE_ENV =
				'production';
			delete process.env.TURNSTILE_SECRET_KEY;
			delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

			const serverConfig = getContactServerConfig();
			// In production without real env vars, Turnstile test keys must NOT be used
			expect(serverConfig.turnstileSecretKey).toBeNull();
			expect(serverConfig.allowsMockDelivery).toBe(false);

			const publicConfig = getContactPublicConfig();
			expect(publicConfig.turnstileSiteKey).toBeNull();
			expect(publicConfig.isFormAvailable).toBe(false);
		} finally {
			(process.env as Record<string, string | undefined>).NODE_ENV =
				savedNodeEnv;
			if (savedTurnstileKey !== undefined) {
				process.env.TURNSTILE_SECRET_KEY = savedTurnstileKey;
			} else {
				delete process.env.TURNSTILE_SECRET_KEY;
			}
			if (savedPublicKey !== undefined) {
				process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = savedPublicKey;
			} else {
				delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
			}
		}
	});
});

describe('SEC-CONTACT-001: Email subject CRLF injection (T8)', () => {
	it('documents that Zod trim() does not strip mid-string CRLF from name field', async () => {
		// CRLF in name passes Zod validation — trim() only strips leading/trailing whitespace.
		// The subject line would be: "Portfolio contact: Jan\r\nBcc: victim@evil.test"
		// Defense relies on Resend SDK sanitizing outbound email headers (see R5).
		const { parseContactSubmission } = await vi.importActual<
			typeof import('@/lib/contact/schema')
		>('@/lib/contact/schema');

		const crlfName = 'Jan\r\nBcc: victim@evil.test';
		const result = parseContactSubmission({
			name: crlfName,
			email: 'jan@example.com',
			company: 'Test Corp',
			message:
				'I need help with a frontend platform migration and shared architecture.',
			website: '',
			renderedAt: Date.now() - 10_000,
			turnstileToken: 'some-token',
		});

		// Zod trim() does NOT strip \r\n from middle of name — document this finding.
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toContain('\r\n');
		}
	});
});
