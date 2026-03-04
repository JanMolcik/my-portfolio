import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('ARCH-DATAFLOW-001', () => {
	it('keeps route data access centralized through src/lib/storyblok/content', async () => {
		const homeRoute = await readFile('src/app/page.tsx', 'utf8');
		const projectRoute = await readFile(
			'src/app/projects/[slug]/page.tsx',
			'utf8',
		);
		const writingRoute = await readFile(
			'src/app/writing/[slug]/page.tsx',
			'utf8',
		);

		expect(homeRoute).toContain("from '@/lib/storyblok/content'");
		expect(projectRoute).toContain("from '@/lib/storyblok/content'");
		expect(writingRoute).toContain("from '@/lib/storyblok/content'");
	});
});
