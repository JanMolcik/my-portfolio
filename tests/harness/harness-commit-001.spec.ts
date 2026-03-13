import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('HARNESS-COMMIT-001', () => {
	it('enforces descriptive ralph auto-commit contract and implementation hooks', async () => {
		const [protocol, loopScript] = await Promise.all([
			readFile('docs/spec/AGENT_ITERATION_PROTOCOL.md', 'utf8'),
			readFile('scripts/ralph-loop.mjs', 'utf8'),
		]);

		expect(protocol).toContain(
			'### Commit Message Contract (Ralph Auto-Commit)',
		);
		expect(protocol).toContain(
			'<type>(<scope>): <imperative summary> (<TASK_ID>)',
		);
		expect(protocol).toContain(
			'MUST NOT copy raw user-story prose (`As a ... I want ...`)',
		);
		expect(protocol).toContain('Changes:');
		expect(protocol).toContain('Validation:');

		expect(loopScript).toContain('function buildTaskCommitMessage');
		expect(loopScript).toContain('git diff --cached --name-only');
		expect(loopScript).toContain('git commit -m');
		expect(loopScript).toContain('commitSubject');
		expect(loopScript).toContain('Changes:');
		expect(loopScript).toContain('Validation:');
	});
});
