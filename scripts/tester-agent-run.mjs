import { spawnSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

function hasCommand(command) {
	const result = spawnSync('sh', ['-lc', `command -v ${command}`], {
		stdio: 'ignore',
	});
	return result.status === 0;
}

function timestamp() {
	const now = new Date();
	const pad = (value) => String(value).padStart(2, '0');
	return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

function runPlaywrightCliStep(args) {
	const result = spawnSync('playwright-cli', args, {
		encoding: 'utf8',
	});
	return {
		ok: result.status === 0,
		status: result.status ?? 1,
		stdout: (result.stdout || '').trim(),
		stderr: (result.stderr || '').trim(),
	};
}

async function main() {
	await access('AGENTS.md', constants.F_OK);

	const reportDir = 'artifacts/tester-agent';
	await mkdir(reportDir, { recursive: true });

	const reportName = `${timestamp()}-report.md`;
	const reportPath = path.join(reportDir, reportName);
	const screenshotPath = path.join(
		reportDir,
		`${reportName.replace('-report.md', '')}-home.png`,
	);

	const findings = [];
	const steps = [];
	const reproduction = [];
	const targetUrl = process.env.TESTER_AGENT_URL;
	const hasPlaywrightCli = hasCommand('playwright-cli');

	if (hasPlaywrightCli && targetUrl) {
		const openResult = runPlaywrightCliStep(['-s=tester', 'open', targetUrl]);
		steps.push(
			`open ${targetUrl} -> ${openResult.ok ? 'ok' : `failed (${openResult.status})`}`,
		);
		if (!openResult.ok) {
			findings.push({
				severity: 'P1',
				detail: `Unable to open target URL via playwright-cli: ${openResult.stderr || 'unknown error'}`,
			});
			reproduction.push(`playwright-cli -s=tester open ${targetUrl}`);
		} else {
			const snapshotResult = runPlaywrightCliStep(['-s=tester', 'snapshot']);
			steps.push(
				`snapshot -> ${snapshotResult.ok ? 'ok' : `failed (${snapshotResult.status})`}`,
			);
			if (!snapshotResult.ok) {
				findings.push({
					severity: 'P2',
					detail: `Snapshot command failed: ${snapshotResult.stderr || 'unknown error'}`,
				});
				reproduction.push('playwright-cli -s=tester snapshot');
			}

			const screenshotResult = runPlaywrightCliStep([
				'-s=tester',
				'screenshot',
				`--filename=${screenshotPath}`,
			]);
			steps.push(
				`screenshot ${screenshotPath} -> ${screenshotResult.ok ? 'ok' : `failed (${screenshotResult.status})`}`,
			);
			if (!screenshotResult.ok) {
				findings.push({
					severity: 'P2',
					detail: `Screenshot command failed: ${screenshotResult.stderr || 'unknown error'}`,
				});
				reproduction.push(
					`playwright-cli -s=tester screenshot --filename=${screenshotPath}`,
				);
			}
		}

		const closeResult = runPlaywrightCliStep(['-s=tester', 'close']);
		steps.push(
			`close -> ${closeResult.ok ? 'ok' : `failed (${closeResult.status})`}`,
		);
	} else {
		steps.push(
			'bootstrap-check: playwright-cli run skipped (missing TESTER_AGENT_URL or command)',
		);
	}

	if (process.env.TESTER_AGENT_BLOCKING_FINDINGS === '1') {
		findings.push({
			severity: 'P1',
			detail: 'Blocking finding injected by TESTER_AGENT_BLOCKING_FINDINGS=1',
		});
		reproduction.push('set TESTER_AGENT_BLOCKING_FINDINGS=1');
	}

	const hasBlocking = findings.some(
		(finding) => finding.severity === 'P0' || finding.severity === 'P1',
	);

	const report = [
		'# Tester-Agent Report',
		'',
		'## Scope',
		'- Gate: `tester-agent:run`',
		'- Canonical prompt source: `AGENTS.md`',
		`- Target URL: ${targetUrl ? `\`${targetUrl}\`` : '`not provided`'}`,
		`- Execution mode: ${hasPlaywrightCli ? '`playwright-cli available`' : '`playwright-cli missing`'}`,
		'',
		'## Steps',
		...steps.map((step) => `- ${step}`),
		'',
		'## Findings',
		...(findings.length > 0
			? findings.map((finding) => `- ${finding.severity}: ${finding.detail}`)
			: ['- None']),
		'',
		'## Severity',
		`- Blocking findings present: ${hasBlocking ? '`yes`' : '`no`'}`,
		'',
		'## Reproduction',
		...(reproduction.length > 0
			? reproduction.map((item) => `- ${item}`)
			: ['- N/A']),
		'',
		'## Suggested guard test',
		'- Keep `tests/e2e/e2e-smoke-001.spec.ts` updated for affected routes and metadata-visible content changes.',
		'',
	].join('\n');

	await writeFile(reportPath, report, 'utf8');
	console.log(`tester-agent report written: ${reportPath}`);

	if (hasBlocking) {
		console.error('tester-agent found blocking findings (P0/P1)');
		process.exit(1);
	}
}

main().catch((error) => {
	console.error(`tester-agent run failed: ${error.message}`);
	process.exit(1);
});
