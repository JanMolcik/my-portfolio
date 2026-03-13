const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

function trimEnv(value: string | undefined): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function shouldUseDevelopmentFallbacks(): boolean {
	return process.env.NODE_ENV !== 'production';
}

export type ContactPublicConfig = {
	turnstileSiteKey: string | null;
	isFormAvailable: boolean;
};

export type ContactServerConfig = {
	turnstileSecretKey: string | null;
	resendApiKey: string | null;
	contactFromEmail: string | null;
	contactToEmail: string | null;
	upstashRedisRestUrl: string | null;
	upstashRedisRestToken: string | null;
	allowsMockDelivery: boolean;
};

export function getContactPublicConfig(): ContactPublicConfig {
	const turnstileSiteKey =
		trimEnv(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) ??
		(shouldUseDevelopmentFallbacks() ? TURNSTILE_TEST_SITE_KEY : null);

	return {
		turnstileSiteKey,
		isFormAvailable: Boolean(turnstileSiteKey),
	};
}

export function getContactServerConfig(): ContactServerConfig {
	return {
		turnstileSecretKey:
			trimEnv(process.env.TURNSTILE_SECRET_KEY) ??
			(shouldUseDevelopmentFallbacks() ? TURNSTILE_TEST_SECRET_KEY : null),
		resendApiKey: trimEnv(process.env.RESEND_API_KEY),
		contactFromEmail: trimEnv(process.env.CONTACT_FROM_EMAIL),
		contactToEmail: trimEnv(process.env.CONTACT_TO_EMAIL),
		upstashRedisRestUrl: trimEnv(process.env.UPSTASH_REDIS_REST_URL),
		upstashRedisRestToken: trimEnv(process.env.UPSTASH_REDIS_REST_TOKEN),
		allowsMockDelivery: shouldUseDevelopmentFallbacks(),
	};
}

export function isContactProtectionConfigured(
	config: ContactServerConfig,
): boolean {
	return Boolean(config.turnstileSecretKey);
}

export function isContactDeliveryConfigured(
	config: ContactServerConfig,
): boolean {
	return Boolean(
		config.resendApiKey && config.contactFromEmail && config.contactToEmail,
	);
}
