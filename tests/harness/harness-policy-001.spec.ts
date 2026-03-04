import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('HARNESS-POLICY-001', () => {
	it('enforces task-brief and CQ guard policy references in iteration protocol', async () => {
		const protocol = await readFile(
			'docs/spec/AGENT_ITERATION_PROTOCOL.md',
			'utf8',
		);
		expect(protocol).toContain(
			'artifacts/task-briefs/<YYYYMMDD-HHMM>-<slug>.md',
		);
		expect(protocol).toContain(
			'Run `CQ` (`pnpm run cq`) after each edit batch',
		);
		expect(protocol).toContain(
			'Code-quality guard check (`cq:check`) before merge',
		);
	});
});
