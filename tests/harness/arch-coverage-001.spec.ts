import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const requiredReferences = [
	'@/lib/storyblok/content',
	'@/lib/seo/metadata',
	'src/app/projects/[slug]/page.tsx',
];

const testFiles = [
	'tests/unit/unit-val-001.spec.ts',
	'tests/integration/int-route-001.spec.ts',
	'tests/integration/int-seo-001.spec.ts',
	'tests/contract/contract-sb-001.spec.ts',
	'tests/harness/arch-route-001.spec.ts',
];

describe('ARCH-COVERAGE-001', () => {
	it('ensures critical modules are referenced by conformance or contract tests', async () => {
		const files = await Promise.all(
			testFiles.map((filePath) => readFile(filePath, 'utf8')),
		);
		const joined = files.join('\n');

		for (const reference of requiredReferences) {
			expect(joined).toContain(reference);
		}
	});
});
