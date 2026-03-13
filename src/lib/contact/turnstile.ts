import { randomUUID } from 'node:crypto';

type TurnstileVerificationResult = {
	success: boolean;
	errorCodes: string[];
};

type TurnstileResponsePayload = {
	success?: boolean;
	'error-codes'?: string[];
};

export async function verifyTurnstileToken(input: {
	token: string;
	secretKey: string;
	remoteIp?: string | null;
}): Promise<TurnstileVerificationResult> {
	const body = new URLSearchParams({
		secret: input.secretKey,
		response: input.token,
		idempotency_key: randomUUID(),
	});

	if (input.remoteIp) {
		body.set('remoteip', input.remoteIp);
	}

	const response = await fetch(
		'https://challenges.cloudflare.com/turnstile/v0/siteverify',
		{
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
			body,
			cache: 'no-store',
		},
	);

	if (!response.ok) {
		throw new Error(
			`Turnstile verification failed with status ${response.status}`,
		);
	}

	const payload = (await response.json()) as TurnstileResponsePayload;
	return {
		success: payload.success === true,
		errorCodes: Array.isArray(payload['error-codes'])
			? payload['error-codes']
			: [],
	};
}
