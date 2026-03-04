import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const routeFiles = [
	'src/app/page.tsx',
	'src/app/projects/[slug]/page.tsx',
	'src/app/writing/[slug]/page.tsx',
];

describe('INT-ROUTE-001', () => {
	it('keeps public routes static-first with ISR', async () => {
		for (const routeFile of routeFiles) {
			const source = await readFile(routeFile, 'utf8');
			expect(source).toContain("export const dynamic = 'force-static';");
			expect(source).toContain('export const revalidate = 3600;');
		}
	});
});
