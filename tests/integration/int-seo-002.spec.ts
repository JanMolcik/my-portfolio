import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('INT-SEO-002', () => {
	it('centralizes route metadata building through src/lib/seo/metadata', async () => {
		const routeFiles = [
			'src/app/page.tsx',
			'src/app/projects/[slug]/page.tsx',
			'src/app/writing/[slug]/page.tsx',
		];

		for (const routeFile of routeFiles) {
			const source = await readFile(routeFile, 'utf8');
			expect(source).toContain("from '@/lib/seo/metadata'");
			expect(source).toContain('buildNotFoundMetadata');
			expect(source).toContain('buildStoryMetadata');
		}
	});
});
