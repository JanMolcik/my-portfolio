import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const REQUIRED_CI_COMMANDS = [
	'pnpm lint',
	'pnpm typecheck',
	'pnpm test:spec-consistency',
	'pnpm test:unit',
	'pnpm test:integration',
	'pnpm test:contract',
	'pnpm test:security',
	'pnpm test:e2e',
	'pnpm test:harness',
	'pnpm tester-agent:run',
] as const;

describe('HARNESS-CI-002', () => {
	it('requires explicit CI commands for mandatory E8-S1 gates', async () => {
		const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
		for (const command of REQUIRED_CI_COMMANDS) {
			expect(workflow).toContain(command);
		}
	});

	it('keeps workflow YAML indentation GitHub-compatible (no tabs)', async () => {
		const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
		expect(workflow).not.toContain('\t');
	});
});
