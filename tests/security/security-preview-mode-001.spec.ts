import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const draftEnableMock = vi.hoisted(() => vi.fn());
const draftDisableMock = vi.hoisted(() => vi.fn());
const draftModeMock = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
	draftMode: draftModeMock,
}));

import { GET as exitPreview } from '@/app/api/exit-preview/route';
import { GET as enablePreview } from '@/app/api/preview/route';
import {
	getSafePreviewRedirectPath,
	isValidPreviewSecret,
} from '@/lib/security/preview';

describe('SEC-PREVIEW-MODE-001', () => {
	const originalPreviewSecret = process.env.PREVIEW_SECRET;

	beforeEach(() => {
		draftEnableMock.mockReset();
		draftDisableMock.mockReset();
		draftModeMock.mockReset();
		draftModeMock.mockResolvedValue({
			isEnabled: false,
			enable: draftEnableMock,
			disable: draftDisableMock,
		});

		process.env.PREVIEW_SECRET = 'preview-secret';
	});

	it('validates preview secret in constant time helper', () => {
		expect(isValidPreviewSecret('preview-secret', 'preview-secret')).toBe(true);
		expect(isValidPreviewSecret('bad-secret', 'preview-secret')).toBe(false);
	});

	it('allows safe redirect paths and rejects external redirect candidates', () => {
		expect(getSafePreviewRedirectPath('/projects/alpha', null)).toBe(
			'/projects/alpha',
		);
		expect(getSafePreviewRedirectPath(null, 'writing/hello-world')).toBe(
			'/writing/hello-world',
		);
		expect(
			getSafePreviewRedirectPath(
				null,
				'experience/senior-frontend-web-developer-solwee',
			),
		).toBe('/#experience');
		expect(getSafePreviewRedirectPath('/unknown/path', null)).toBe('/');
		expect(getSafePreviewRedirectPath(null, '{{full_slug}}home')).toBe('/');
		expect(
			getSafePreviewRedirectPath(null, '{{full_slug}}projects/alpha'),
		).toBe('/projects/alpha');
		expect(getSafePreviewRedirectPath('//evil.test', null)).toBeNull();
		expect(
			getSafePreviewRedirectPath('https://evil.test/pwned', null),
		).toBeNull();
	});

	it('rejects preview enable request when secret is invalid', async () => {
		const response = await enablePreview(
			new Request('https://example.com/api/preview?secret=invalid&slug=home'),
		);

		expect(response.status).toBe(401);
		expect(draftEnableMock).not.toHaveBeenCalled();
	});

	it('rejects preview enable request with unsafe redirect path', async () => {
		const response = await enablePreview(
			new Request(
				'https://example.com/api/preview?secret=preview-secret&path=//evil.test',
			),
		);

		expect(response.status).toBe(400);
		expect(draftEnableMock).not.toHaveBeenCalled();
	});

	it('enables draft mode and redirects safely for valid preview request', async () => {
		const response = await enablePreview(
			new Request(
				'https://example.com/api/preview?secret=preview-secret&slug=projects/alpha',
			),
		);

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe('/projects/alpha');
		expect(draftEnableMock).toHaveBeenCalledTimes(1);
	});

	it('supports route-suffixed preview URLs when slug placeholder is not expanded', async () => {
		const response = await enablePreview(
			new Request(
				'https://example.com/api/preview/projects/alpha?secret=preview-secret&slug={{full_slug}}',
			),
		);

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe('/projects/alpha');
		expect(draftEnableMock).toHaveBeenCalledTimes(1);
	});

	it('validates secret on exit-preview and disables draft mode for valid requests', async () => {
		const unauthorized = await exitPreview(
			new Request(
				'https://example.com/api/exit-preview?secret=invalid&path=/projects/alpha',
			),
		);
		expect(unauthorized.status).toBe(401);
		expect(draftDisableMock).not.toHaveBeenCalled();

		const authorized = await exitPreview(
			new Request(
				'https://example.com/api/exit-preview?secret=preview-secret&path=/projects/alpha',
			),
		);
		expect(authorized.status).toBe(307);
		expect(authorized.headers.get('location')).toBe('/projects/alpha');
		expect(draftDisableMock).toHaveBeenCalledTimes(1);
	});

	it('supports route-suffixed exit-preview URLs', async () => {
		const response = await exitPreview(
			new Request(
				'https://example.com/api/exit-preview/projects/alpha?secret=preview-secret&slug={{full_slug}}',
			),
		);

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe('/projects/alpha');
		expect(draftDisableMock).toHaveBeenCalledTimes(1);
	});

	describe('getSafePreviewRedirectPath edge cases (T9)', () => {
		it('returns safe default for null byte in path', () => {
			// %00 in a multi-segment path doesn't match any known route → defaults to /
			expect(getSafePreviewRedirectPath('/projects/%00/evil', null)).toBe('/');
		});

		it('returns safe path for encoded slash injection', () => {
			// %2F%2F does not produce a protocol-relative path at the routing level
			expect(getSafePreviewRedirectPath('/%2F%2Fevil.com', null)).toBe('/');
		});

		it('returns safe path for double-encoded slash', () => {
			// %252F is double-encoded; URL parser treats it as an opaque slug segment
			const result = getSafePreviewRedirectPath('/projects/%252Fevil', null);
			expect(result).not.toMatch(/^https?:/);
			if (result !== null) {
				expect(result.startsWith('/')).toBe(true);
			}
		});

		it('rejects backslash paths', () => {
			expect(getSafePreviewRedirectPath('/projects\\evil', null)).toBeNull();
		});

		it('returns home for empty string', () => {
			expect(getSafePreviewRedirectPath('', null)).toBe('/');
		});

		it('returns home for whitespace-only path', () => {
			expect(getSafePreviewRedirectPath('   ', null)).toBe('/');
		});

		it('handles unicode path components safely', () => {
			const result = getSafePreviewRedirectPath('/projects/caf\u00e9', null);
			expect(result).not.toMatch(/^https?:/);
			if (result !== null) {
				expect(result.startsWith('/')).toBe(true);
			}
		});

		it('handles very long paths safely', () => {
			const longSlug = 'a'.repeat(1000);
			const result = getSafePreviewRedirectPath(`/projects/${longSlug}`, null);
			expect(result).not.toMatch(/^https?:/);
			if (result !== null) {
				expect(result.startsWith('/')).toBe(true);
			}
		});
	});

	afterAll(() => {
		if (originalPreviewSecret) {
			process.env.PREVIEW_SECRET = originalPreviewSecret;
		} else {
			delete process.env.PREVIEW_SECRET;
		}
	});
});
