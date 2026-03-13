import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const RUNNER_PATH = 'scripts/tester-agent-run.mjs';

function runTesterAgentWithEnv(envOverrides: Record<string, string>) {
	return spawnSync('node', [RUNNER_PATH], {
		cwd: process.cwd(),
		encoding: 'utf8',
		env: {
			...process.env,
			...envOverrides,
		},
	});
}

describe('HARNESS-TESTER-AGENT-001', () => {
	it('generates a markdown report artifact with required sections', async () => {
		const tempRoot = await mkdtemp(path.join(tmpdir(), 'tester-agent-'));
		const reportDir = path.join(tempRoot, 'reports');
		const stamp = '20990101-000001';
		const reportPath = path.join(reportDir, `${stamp}-report.md`);
		const evidencePath = path.join(reportDir, `${stamp}-evidence.json`);

		const result = runTesterAgentWithEnv({
			TESTER_AGENT_REPORT_DIR: reportDir,
			TESTER_AGENT_TIMESTAMP: stamp,
		});

		expect(result.status).toBe(0);
		const report = await readFile(reportPath, 'utf8');
		const evidence = JSON.parse(await readFile(evidencePath, 'utf8')) as {
			enforce: boolean;
			requiredPaths: string[];
			playwrightLogDir: string;
			logMetricsBefore: { count: number; newestMs: number };
			logMetricsAfter: { count: number; newestMs: number };
			findings: Array<{ severity: string; detail: string }>;
		};
		expect(report).toContain('## Scope');
		expect(report).toContain('## Steps');
		expect(report).toContain('## Findings');
		expect(report).toContain('## Severity');
		expect(report).toContain('## Reproduction');
		expect(report).toContain('## Suggested guard test');
		expect(report).toContain('- Blocking findings present: `no`');
		expect(evidence.enforce).toBe(false);
		expect(evidence.requiredPaths).toEqual(['/']);
		expect(evidence.playwrightLogDir.length).toBeGreaterThan(0);
		expect(Array.isArray(evidence.findings)).toBe(true);
		expect(typeof evidence.logMetricsBefore.count).toBe('number');
		expect(typeof evidence.logMetricsAfter.newestMs).toBe('number');
	});

	it('blocks when a P0/P1 finding is present and still writes report', async () => {
		const tempRoot = await mkdtemp(path.join(tmpdir(), 'tester-agent-'));
		const reportDir = path.join(tempRoot, 'reports');
		const stamp = '20990101-000002';
		const reportPath = path.join(reportDir, `${stamp}-report.md`);

		const result = runTesterAgentWithEnv({
			TESTER_AGENT_REPORT_DIR: reportDir,
			TESTER_AGENT_TIMESTAMP: stamp,
			TESTER_AGENT_BLOCKING_FINDINGS: '1',
		});

		expect(result.status).toBe(1);
		const report = await readFile(reportPath, 'utf8');
		expect(report).toContain(
			'P1: Blocking finding injected by TESTER_AGENT_BLOCKING_FINDINGS=1',
		);
		expect(report).toContain('- Blocking findings present: `yes`');
		expect(result.stderr).toContain(
			'tester-agent found blocking findings (P0/P1)',
		);
	});

	it('fails enforce mode when URL is not explicitly provided', async () => {
		const tempRoot = await mkdtemp(path.join(tmpdir(), 'tester-agent-'));
		const reportDir = path.join(tempRoot, 'reports');
		const stamp = '20990101-000003';
		const reportPath = path.join(reportDir, `${stamp}-report.md`);

		const result = runTesterAgentWithEnv({
			TESTER_AGENT_REPORT_DIR: reportDir,
			TESTER_AGENT_TIMESTAMP: stamp,
			TESTER_AGENT_ENFORCE: '1',
		});

		expect(result.status).toBe(1);
		const report = await readFile(reportPath, 'utf8');
		expect(report).toContain(
			'TESTER_AGENT_URL is required in enforce mode (set explicit URL for deterministic visual verification).',
		);
		expect(report).toContain('- Blocking findings present: `yes`');
	});
});
