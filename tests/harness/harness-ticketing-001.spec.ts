import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('HARNESS-TICKETING-001', () => {
	it('keeps local markdown ticket system and matrix tooling executable', async () => {
		await access('tickets/MATRIX.md', constants.F_OK);
		await access('tickets/templates/epic.md', constants.F_OK);
		await access('tickets/templates/user-story.md', constants.F_OK);
		await access('tickets/templates/bug.md', constants.F_OK);
		await access('scripts/spec-fragmenter.mjs', constants.F_OK);
		await access('scripts/tickets-sync.mjs', constants.F_OK);
		await access('scripts/tickets-to-queue.mjs', constants.F_OK);

		const [packageJson, matrix, protocol] = await Promise.all([
			readFile('package.json', 'utf8'),
			readFile('tickets/MATRIX.md', 'utf8'),
			readFile('docs/spec/AGENT_ITERATION_PROTOCOL.md', 'utf8'),
		]);

		expect(packageJson).toContain('"tickets:fragment"');
		expect(packageJson).toContain('"tickets:sync"');
		expect(packageJson).toContain('"tickets:queue"');
		expect(packageJson).toContain('"tickets:build"');

		expect(matrix).toContain('| ID | Type | Title | Status |');
		expect(protocol).toContain('## Local Markdown Ticket Contract');
	});
});
