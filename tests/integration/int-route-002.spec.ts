import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('INT-ROUTE-002', () => {
	it('keeps slug routes pre-renderable via static params', async () => {
		const projectRoute = await readFile(
			'src/app/projects/[slug]/page.tsx',
			'utf8',
		);
		const writingRoute = await readFile(
			'src/app/writing/[slug]/page.tsx',
			'utf8',
		);

		expect(projectRoute).toContain('export const dynamicParams = true;');
		expect(projectRoute).toContain(
			'export async function generateStaticParams',
		);

		expect(writingRoute).toContain('export const dynamicParams = true;');
		expect(writingRoute).toContain(
			'export async function generateStaticParams',
		);
	});
});
