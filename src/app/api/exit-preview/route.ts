import { draftMode } from 'next/headers';
import { NextResponse } from 'next/server';
import { logInfo, logServerError } from '@/lib/monitoring/logger';
import {
	getSafePreviewRedirectPath,
	isValidPreviewSecret,
} from '@/lib/security/preview';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function logExitPreviewDecision(
	decision: 'accepted' | 'rejected',
	reason: string,
	metadata?: Record<string, string | null>,
) {
	logInfo('preview_mode', {
		route: '/api/exit-preview',
		decision,
		reason,
		...metadata,
	});
}

export async function GET(request: Request) {
	try {
		const requestUrl = new URL(request.url);
		const secret = requestUrl.searchParams.get('secret');
		const pathFromRoute = requestUrl.pathname.startsWith('/api/exit-preview/')
			? requestUrl.pathname.slice('/api/exit-preview'.length)
			: null;

		if (!isValidPreviewSecret(secret, process.env.PREVIEW_SECRET)) {
			logExitPreviewDecision('rejected', 'invalid_secret');
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const redirectPathFromRoute = pathFromRoute
			? getSafePreviewRedirectPath(pathFromRoute, null)
			: null;
		const redirectPathFromQuery = getSafePreviewRedirectPath(
			requestUrl.searchParams.get('path'),
			requestUrl.searchParams.get('slug'),
		);
		const redirectPath = redirectPathFromRoute ?? redirectPathFromQuery;
		if (!redirectPath) {
			logExitPreviewDecision('rejected', 'unsafe_redirect', {
				path: requestUrl.searchParams.get('path'),
				slug: requestUrl.searchParams.get('slug'),
				pathFromRoute,
			});
			return NextResponse.json(
				{ error: 'Invalid redirect path' },
				{ status: 400 },
			);
		}

		const preview = await draftMode();
		preview.disable();

		logExitPreviewDecision('accepted', 'preview_disabled', {
			redirectPath,
		});

		return new NextResponse(null, {
			status: 307,
			headers: { Location: redirectPath },
		});
	} catch (error) {
		logServerError('preview_exit_failed', error, {
			route: '/api/exit-preview',
		});
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 },
		);
	}
}
