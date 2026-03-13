import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/monitoring/logger';

const NO_STORE_HEADERS = {
	'cache-control': 'no-store, max-age=0',
};

export async function GET() {
	try {
		return NextResponse.json(
			{
				status: 'ok',
				timestamp: new Date().toISOString(),
				uptimeSeconds: Number(process.uptime().toFixed(3)),
			},
			{
				status: 200,
				headers: NO_STORE_HEADERS,
			},
		);
	} catch (error) {
		logServerError('uptime_check_failed', error, { route: '/api/uptime' });
		return NextResponse.json(
			{
				status: 'error',
			},
			{
				status: 500,
				headers: NO_STORE_HEADERS,
			},
		);
	}
}
