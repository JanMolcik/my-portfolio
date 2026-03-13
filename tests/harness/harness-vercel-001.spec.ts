import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('HARNESS-VERCEL-001', () => {
	it('keeps the Vercel environment connection runbook aligned with E8-S2 acceptance', async () => {
		const runbook = await readFile('docs/ops/vercel-environments.md', 'utf8');

		expect(runbook).toContain('vercel login');
		expect(runbook).toContain('vercel link');
		expect(runbook).toContain('GitHub');
		expect(runbook).toContain('Pull request branches -> `Preview`');
		expect(runbook).toContain('`main` -> `Production`');
		expect(runbook).toContain('Production Branch set to `main`');
		expect(runbook).toContain('.vercel/project.json');
	});
});
