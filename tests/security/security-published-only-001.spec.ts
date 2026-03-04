import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('SEC-PUBLISHED-ONLY-001', () => {
	it('keeps non-preview content fetch pinned to published mode', async () => {
		const source = await readFile('src/lib/storyblok/content.ts', 'utf8');
		expect(source).toContain("version: 'published'");
	});

	it('documents preview and webhook secret requirements', async () => {
		const spec = await readFile('docs/spec/PROJECT_SPEC.md', 'utf8');
		expect(spec).toContain('PREVIEW_SECRET');
		expect(spec).toContain('STORYBLOK_WEBHOOK_SECRET');
		expect(spec).toContain('constant time');
	});
});
