import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('ARCH-SEO-001', () => {
	it('keeps route metadata generation centralized through src/lib/seo/metadata', async () => {
		const projectRoute = await readFile(
			'src/app/projects/[slug]/page.tsx',
			'utf8',
		);
		const writingRoute = await readFile(
			'src/app/writing/[slug]/page.tsx',
			'utf8',
		);

		expect(projectRoute).toContain("from '@/lib/seo/metadata'");
		expect(writingRoute).toContain("from '@/lib/seo/metadata'");
	});
});
