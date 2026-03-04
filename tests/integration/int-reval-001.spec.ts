import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('INT-REVAL-001', () => {
	it('keeps revalidation route gap explicitly tracked in CURRENT_TRUTH until implemented', async () => {
		const currentTruth = await readFile('docs/spec/CURRENT_TRUTH.md', 'utf8');
		expect(currentTruth).toContain('revalidate handlers');
		expect(currentTruth).toContain('Remaining gaps');
	});
});
