import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('ARCH-SEO-001', () => {
	it('keeps SEO generation centralized through src/lib/seo/*', async () => {
		const homeRoute = await readFile('src/app/page.tsx', 'utf8');
		const projectRoute = await readFile(
			'src/app/projects/[slug]/page.tsx',
			'utf8',
		);
		const writingRoute = await readFile(
			'src/app/writing/[slug]/page.tsx',
			'utf8',
		);

		expect(homeRoute).toContain("from '@/lib/seo/metadata'");
		expect(homeRoute).toContain("from '@/lib/seo/json-ld'");
		expect(homeRoute).toContain('application/ld+json');

		expect(projectRoute).toContain("from '@/lib/seo/metadata'");
		expect(projectRoute).toContain("from '@/lib/seo/json-ld'");
		expect(projectRoute).toContain('application/ld+json');

		expect(writingRoute).toContain("from '@/lib/seo/metadata'");
		expect(writingRoute).toContain("from '@/lib/seo/json-ld'");
		expect(writingRoute).toContain('application/ld+json');
	});
});
