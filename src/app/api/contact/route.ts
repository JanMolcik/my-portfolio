import { NextResponse } from 'next/server';
import {
	getContactServerConfig,
	isContactProtectionConfigured,
} from '@/lib/contact/config';
import { deliverContactMessage } from '@/lib/contact/delivery';
import { getClientIp } from '@/lib/contact/request';
import { applyContactRateLimit } from '@/lib/contact/rate-limit';
import {
	parseContactSubmission,
	submittedTooQuickly,
} from '@/lib/contact/schema';
import { verifyTurnstileToken } from '@/lib/contact/turnstile';
import { logInfo, logServerError } from '@/lib/monitoring/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function jsonResponse(body: Record<string, unknown>, status: number) {
	return NextResponse.json(body, {
		status,
		headers: {
			'cache-control': 'no-store, max-age=0',
		},
	});
}

function buildPayloadFromFormData(formData: FormData) {
	return {
		name: String(formData.get('name') ?? ''),
		email: String(formData.get('email') ?? ''),
		company: String(formData.get('company') ?? ''),
		message: String(formData.get('message') ?? ''),
		website: String(formData.get('website') ?? ''),
		renderedAt: String(formData.get('renderedAt') ?? ''),
		turnstileToken: String(formData.get('cf-turnstile-response') ?? ''),
	};
}

async function parseRequestPayload(request: Request): Promise<unknown> {
	const contentType = request.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		return request.json();
	}

	const formData = await request.formData();
	return buildPayloadFromFormData(formData);
}

export async function POST(request: Request) {
	try {
		let payload: unknown;
		try {
			payload = await parseRequestPayload(request);
		} catch {
			logInfo('contact_form_rejected', {
				route: '/api/contact',
				reason: 'invalid_request_body',
			});
			return jsonResponse({ error: 'Invalid contact submission' }, 400);
		}

		const parsed = parseContactSubmission(payload);
		if (!parsed.success) {
			logInfo('contact_form_rejected', {
				route: '/api/contact',
				reason: 'invalid_payload',
			});
			return jsonResponse({ error: 'Invalid contact submission' }, 400);
		}

		if (parsed.data.website.length > 0) {
			logInfo('contact_form_ignored', {
				route: '/api/contact',
				reason: 'honeypot_triggered',
			});
			return jsonResponse({ ok: true, message: 'Message accepted.' }, 202);
		}

		if (submittedTooQuickly(parsed.data.renderedAt)) {
			logInfo('contact_form_rejected', {
				route: '/api/contact',
				reason: 'submitted_too_quickly',
			});
			return jsonResponse({ error: 'Submission rejected' }, 400);
		}

		const config = getContactServerConfig();
		if (!isContactProtectionConfigured(config)) {
			logInfo('contact_form_rejected', {
				route: '/api/contact',
				reason: 'missing_turnstile_secret',
			});
			return jsonResponse({ error: 'Contact form is unavailable' }, 503);
		}

		const clientIp = getClientIp(request);
		const rateLimit = await applyContactRateLimit(clientIp ?? 'anonymous');
		if (!rateLimit.success) {
			logInfo('contact_form_rejected', {
				route: '/api/contact',
				reason: 'rate_limited',
				provider: rateLimit.provider,
			});
			return jsonResponse(
				{ error: 'Too many attempts. Try again later.' },
				429,
			);
		}

		const verification = await verifyTurnstileToken({
			token: parsed.data.turnstileToken,
			secretKey: config.turnstileSecretKey!,
			remoteIp: clientIp,
		});
		if (!verification.success) {
			logInfo('contact_form_rejected', {
				route: '/api/contact',
				reason: 'turnstile_failed',
				error_codes: verification.errorCodes.join(',') || null,
			});
			return jsonResponse({ error: 'Verification failed. Please retry.' }, 400);
		}

		const delivery = await deliverContactMessage(parsed.data, config);
		logInfo('contact_form_accepted', {
			route: '/api/contact',
			delivery: delivery.mocked ? 'mocked' : 'sent',
			has_company: Boolean(parsed.data.company),
		});

		return jsonResponse(
			{
				ok: true,
				message: delivery.mocked
					? 'Local preview mode accepted your message. Configure email delivery for live inbox sending.'
					: 'Message sent. I usually reply within 48 hours.',
			},
			delivery.mocked ? 202 : 200,
		);
	} catch (error) {
		logServerError('contact_form_failed', error, {
			route: '/api/contact',
		});
		return jsonResponse({ error: 'Internal Server Error' }, 500);
	}
}
