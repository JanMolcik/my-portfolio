import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const REQUIRED_NORMATIVE_GATES = [
	'pnpm cq:check',
	'pnpm test:spec-consistency',
	'pnpm test:unit',
	'pnpm test:integration',
	'pnpm test:contract',
	'pnpm test:security',
	'pnpm test:e2e',
	'pnpm test:harness',
	'pnpm tester-agent:run',
] as const;

describe('HARNESS-LAUNCH-001', () => {
	it('defines the launch-readiness runbook contract with rollback steps', async () => {
		const runbook = await readFile(
			'docs/ops/launch-readiness-signoff.md',
			'utf8',
		);

		expect(runbook).toContain('## Final Checklist');
		expect(runbook).toContain('## Rollback Path');
		expect(runbook).toContain('vercel rollback <deployment-id-or-url>');
		for (const gate of REQUIRED_NORMATIVE_GATES) {
			expect(runbook).toContain(gate);
		}
	});

	it('keeps release sign-off checklist complete for deterministic launch', async () => {
		const signoff = await readFile(
			'artifacts/release/launch-readiness-signoff.md',
			'utf8',
		);

		expect(signoff).toContain(
			'- [x] Invariants covered (`INV-5` traceability confirmed in `tests/conformance/invariant-traceability.json`).',
		);
		expect(signoff).toContain(
			'- [x] Normative gates green (see gate checklist below).',
		);
		expect(signoff).toContain(
			'- [x] Docs/changelog updated in this iteration.',
		);
		expect(signoff).toContain('- [x] Rollback path documented and executable.');
		expect(signoff).toContain('vercel rollback <deployment-id-or-url>');
		for (const gate of REQUIRED_NORMATIVE_GATES) {
			expect(signoff).toContain(`- [x] \`${gate}\``);
		}
	});
});
