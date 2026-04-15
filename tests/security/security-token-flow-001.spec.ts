import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storyblokInitMock = vi.hoisted(() => vi.fn());

vi.mock('@storyblok/react/rsc', () => ({
	apiPlugin: {},
	storyblokInit: storyblokInitMock,
}));

vi.mock('@/components/Page', () => ({ default: {} }));
vi.mock('@/components/Feature', () => ({ default: {} }));
vi.mock('@/components/Grid', () => ({ default: {} }));
vi.mock('@/components/Teaser', () => ({ default: {} }));

describe('SEC-TOKEN-FLOW-001', () => {
	beforeEach(() => {
		vi.resetModules();
		storyblokInitMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe('token fallback chain in src/lib/storyblok/client.ts', () => {
		it('uses STORYBLOK_ACCESS_TOKEN with highest priority when all three tokens are set', async () => {
			vi.stubEnv('STORYBLOK_ACCESS_TOKEN', 'access-token-value');
			vi.stubEnv('STORYBLOK_DELIVERY_API_TOKEN', 'delivery-token-value');
			vi.stubEnv('STORYBLOK_PREVIEW_TOKEN', 'preview-token-value');

			await import('@/lib/storyblok/client');

			expect(storyblokInitMock).toHaveBeenCalledOnce();
			expect(storyblokInitMock).toHaveBeenCalledWith(
				expect.objectContaining({ accessToken: 'access-token-value' }),
			);
		});

		it('resolves to STORYBLOK_DELIVERY_API_TOKEN when ACCESS_TOKEN is absent', async () => {
			vi.stubEnv('STORYBLOK_DELIVERY_API_TOKEN', 'delivery-token-value');
			vi.stubEnv('STORYBLOK_PREVIEW_TOKEN', 'preview-token-value');

			await import('@/lib/storyblok/client');

			expect(storyblokInitMock).toHaveBeenCalledOnce();
			expect(storyblokInitMock).toHaveBeenCalledWith(
				expect.objectContaining({ accessToken: 'delivery-token-value' }),
			);
		});

		it('normal production config (DELIVERY_API_TOKEN set, no PREVIEW_TOKEN) does not resolve to STORYBLOK_PREVIEW_TOKEN', async () => {
			vi.stubEnv('STORYBLOK_DELIVERY_API_TOKEN', 'delivery-token-value');

			await import('@/lib/storyblok/client');

			expect(storyblokInitMock).toHaveBeenCalledOnce();
			const [callArg] = storyblokInitMock.mock.calls[0] as [
				{ accessToken: string },
			];
			expect(callArg.accessToken).toBe('delivery-token-value');
			expect(callArg.accessToken).not.toContain('preview');
		});

		it('resolves to STORYBLOK_PREVIEW_TOKEN only when both preferred tokens are absent (misconfiguration scenario)', async () => {
			vi.stubEnv('STORYBLOK_PREVIEW_TOKEN', 'preview-token-value');

			await import('@/lib/storyblok/client');

			expect(storyblokInitMock).toHaveBeenCalledOnce();
			expect(storyblokInitMock).toHaveBeenCalledWith(
				expect.objectContaining({ accessToken: 'preview-token-value' }),
			);
		});
	});

	describe('StoryblokProvider client-side boundary', () => {
		it('has "use client" directive as the first line of StoryblokProvider.tsx', async () => {
			const content = await readFile(
				'src/components/StoryblokProvider.tsx',
				'utf8',
			);
			const firstLine = content.split('\n')[0].trim();
			expect(firstLine).toBe("'use client';");
		});
	});

	describe('next.config.mjs client bundle injection', () => {
		it('injects STORYBLOK_DELIVERY_API_TOKEN to the client bundle but not STORYBLOK_ACCESS_TOKEN', async () => {
			const config = await readFile('next.config.mjs', 'utf8');
			const envBlockMatch = config.match(/\benv:\s*\{[^}]+\}/s);
			expect(
				envBlockMatch,
				'env block not found in next.config.mjs',
			).not.toBeNull();
			const envBlock = envBlockMatch![0];

			expect(envBlock).toContain('STORYBLOK_DELIVERY_API_TOKEN');
			expect(envBlock).not.toContain('STORYBLOK_ACCESS_TOKEN');
		});
	});
});
