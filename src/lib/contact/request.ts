function normalizeForwardedFor(headerValue: string | null): string | null {
	if (!headerValue) {
		return null;
	}

	const firstAddress = headerValue.split(',')[0]?.trim();
	return firstAddress && firstAddress.length > 0 ? firstAddress : null;
}

export function getClientIp(request: Request): string | null {
	return (
		normalizeForwardedFor(request.headers.get('cf-connecting-ip')) ??
		normalizeForwardedFor(request.headers.get('x-forwarded-for')) ??
		normalizeForwardedFor(request.headers.get('x-real-ip'))
	);
}
