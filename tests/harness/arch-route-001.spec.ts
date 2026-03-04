import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const publicRoutes = [
	'src/app/page.tsx',
	'src/app/projects/[slug]/page.tsx',
	'src/app/writing/[slug]/page.tsx',
];

describe('ARCH-ROUTE-001', () => {
	it('keeps public route files pinned to static-first policy declarations', async () => {
		for (const routePath of publicRoutes) {
			const source = await readFile(routePath, 'utf8');
			expect(source).toContain("export const dynamic = 'force-static';");
			expect(source).toContain('export const revalidate = 3600;');
		}
	});
});
