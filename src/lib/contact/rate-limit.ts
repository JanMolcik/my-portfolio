import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const CONTACT_RATE_LIMIT_MAX_REQUESTS = 4;
export const CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

type ContactRateLimitResult = {
	success: boolean;
	limit: number;
	remaining: number;
	reset: number;
	provider: 'memory' | 'upstash';
};

const localRateLimitWindows = new Map<string, number[]>();
let upstashRatelimit: Ratelimit | null | undefined;

function getUpstashRateLimiter(): Ratelimit | null {
	if (upstashRatelimit !== undefined) {
		return upstashRatelimit;
	}

	const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
	const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
	if (!url || !token) {
		upstashRatelimit = null;
		return upstashRatelimit;
	}

	upstashRatelimit = new Ratelimit({
		redis: new Redis({ url, token }),
		limiter: Ratelimit.slidingWindow(CONTACT_RATE_LIMIT_MAX_REQUESTS, '10 m'),
		analytics: false,
		prefix: 'portfolio-contact',
	});

	return upstashRatelimit;
}

function applyLocalContactRateLimit(
	identifier: string,
): ContactRateLimitResult {
	const now = Date.now();
	const windowStart = now - CONTACT_RATE_LIMIT_WINDOW_MS;
	const currentWindow = (localRateLimitWindows.get(identifier) ?? []).filter(
		(timestamp) => timestamp > windowStart,
	);

	if (currentWindow.length >= CONTACT_RATE_LIMIT_MAX_REQUESTS) {
		const resetAt = Math.min(...currentWindow) + CONTACT_RATE_LIMIT_WINDOW_MS;
		localRateLimitWindows.set(identifier, currentWindow);
		return {
			success: false,
			limit: CONTACT_RATE_LIMIT_MAX_REQUESTS,
			remaining: 0,
			reset: resetAt,
			provider: 'memory',
		};
	}

	currentWindow.push(now);
	localRateLimitWindows.set(identifier, currentWindow);

	return {
		success: true,
		limit: CONTACT_RATE_LIMIT_MAX_REQUESTS,
		remaining: Math.max(
			0,
			CONTACT_RATE_LIMIT_MAX_REQUESTS - currentWindow.length,
		),
		reset: now + CONTACT_RATE_LIMIT_WINDOW_MS,
		provider: 'memory',
	};
}

export async function applyContactRateLimit(
	identifier: string,
): Promise<ContactRateLimitResult> {
	const normalizedIdentifier = identifier.trim() || 'anonymous';
	const upstash = getUpstashRateLimiter();

	if (!upstash) {
		return applyLocalContactRateLimit(normalizedIdentifier);
	}

	const result = await upstash.limit(normalizedIdentifier);
	return {
		success: result.success,
		limit: result.limit,
		remaining: result.remaining,
		reset: result.reset,
		provider: 'upstash',
	};
}

export function resetLocalContactRateLimitStateForTests() {
	localRateLimitWindows.clear();
	upstashRatelimit = undefined;
}
