import { spawn, spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_STEP_TIMEOUT_MS = 20_000;
const DEFAULT_START_TIMEOUT_MS = 90_000;
const DEFAULT_TESTER_URL = 'http://127.0.0.1:3000';
const DEFAULT_REQUIRED_PATHS = '/';
const DEFAULT_PLAYWRIGHT_SESSION = 'tester';

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

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function parseBoolean(value, fallback = false) {
	if (value === undefined || value === null || value === '') {
		return fallback;
	}
	const normalized = String(value).trim().toLowerCase();
	if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
		return true;
	}
	if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
		return false;
	}
	return fallback;
}

function parseInteger(value, fallback) {
	const parsed = Number.parseInt(String(value ?? ''), 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}
	return parsed;
}

function runCommand(command, args, timeoutMs = DEFAULT_STEP_TIMEOUT_MS) {
	const result = spawnSync(command, args, {
		encoding: 'utf8',
		timeout: timeoutMs,
		maxBuffer: 10 * 1024 * 1024,
	});

	const timedOut = result.signal === 'SIGTERM' || result.signal === 'SIGKILL';
	return {
		timedOut,
		ok: result.status === 0 && !timedOut,
		status: result.status ?? (timedOut ? 124 : 1),
		stdout: (result.stdout || '').trim(),
		stderr: (result.stderr || '').trim(),
	};
}

async function snapshotDirectoryMetrics(dirPath) {
	const metrics = {
		exists: false,
		count: 0,
		newestMs: 0,
	};

	try {
		await access(dirPath, constants.F_OK);
		metrics.exists = true;
	} catch {
		return metrics;
	}

	async function walk(currentPath) {
		const entries = await readdir(currentPath, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(currentPath, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
				continue;
			}
			if (entry.isFile()) {
				metrics.count += 1;
				const fileStats = await stat(fullPath);
				metrics.newestMs = Math.max(metrics.newestMs, fileStats.mtimeMs);
			}
		}
	}

	await walk(dirPath);
	return metrics;
}

async function detectPlaywrightLogDir(explicitDir) {
	const candidates = [
		explicitDir,
		path.join(process.cwd(), '.playwright-cli'),
		path.join(path.dirname(process.cwd()), '.playwright-cli'),
		path.join(os.homedir(), '.playwright-cli'),
		path.join(os.homedir(), 'Code', '.playwright-cli'),
	].filter(Boolean);

	for (const candidate of candidates) {
		try {
			await access(candidate, constants.F_OK);
			return candidate;
		} catch {
			// try next
		}
	}

	return explicitDir || path.join(process.cwd(), '.playwright-cli');
}

function parseRequiredPaths(rawValue) {
	const raw = (rawValue || DEFAULT_REQUIRED_PATHS)
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);

	if (raw.length === 0) {
		return ['/'];
	}

	const normalized = raw.map((entry) => {
		if (/^https?:\/\//i.test(entry)) {
			return entry;
		}
		if (entry.startsWith('/')) {
			return entry;
		}
		return `/${entry}`;
	});

	return [...new Set(normalized)];
}

function toAbsoluteUrl(baseUrl, pathOrUrl) {
	if (/^https?:\/\//i.test(pathOrUrl)) {
		return pathOrUrl;
	}
	const base = new URL(baseUrl);
	return new URL(pathOrUrl, `${base.origin}/`).toString();
}

function routeSlug(pathOrUrl, index) {
	try {
		const parsed = new URL(pathOrUrl, DEFAULT_TESTER_URL);
		const fromPath = parsed.pathname
			.replace(/^\/+|\/+$/g, '')
			.replace(/[^a-zA-Z0-9_-]+/g, '-');
		if (fromPath.length > 0) {
			return fromPath.slice(0, 60);
		}
	} catch {
		// fallback below
	}
	return `route-${index + 1}`;
}

function isHealthyPageOutput(output) {
	if (!output) {
		return true;
	}
	return !/(\b404\b|not\s+found|err_connection_refused|this site can.?t be reached)/i.test(
		output,
	);
}

function startServer(startCommand) {
	if (!startCommand) {
		return null;
	}

	return spawn('sh', ['-lc', startCommand], {
		stdio: 'ignore',
		env: process.env,
	});
}

function stopProcess(child) {
	if (!child || child.killed) {
		return;
	}
	try {
		child.kill('SIGTERM');
	} catch {
		// ignore
	}
}

async function waitForHttpReachability(url, timeoutMs, stepTimeoutMs) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		const probe = runCommand(
			'curl',
			['-sS', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '2', url],
			stepTimeoutMs,
		);
		const status = Number.parseInt(probe.stdout, 10);
		if (probe.ok && Number.isFinite(status) && status >= 200 && status < 400) {
			return true;
		}
		await sleep(500);
	}
	return false;
}

async function main() {
	await access('AGENTS.md', constants.F_OK);

	const reportDir =
		process.env.TESTER_AGENT_REPORT_DIR?.trim() || 'artifacts/tester-agent';
	await mkdir(reportDir, { recursive: true });

	const reportStamp = process.env.TESTER_AGENT_TIMESTAMP?.trim() || timestamp();
	const reportName = `${reportStamp}-report.md`;
	const reportPath = path.join(reportDir, reportName);
	const evidencePath = path.join(
		reportDir,
		`${reportName.replace('-report.md', '')}-evidence.json`,
	);
	const runLabel = process.env.TESTER_AGENT_RUN_LABEL?.trim() || '';

	const enforce = parseBoolean(process.env.TESTER_AGENT_ENFORCE, false);
	const requireLogChange = parseBoolean(
		process.env.TESTER_AGENT_REQUIRE_PLAYWRIGHT_LOG_CHANGE,
		enforce,
	);
	const timeoutMs = parseInteger(
		process.env.TESTER_AGENT_STEP_TIMEOUT_MS,
		DEFAULT_STEP_TIMEOUT_MS,
	);
	const startTimeoutMs = parseInteger(
		process.env.TESTER_AGENT_START_TIMEOUT_MS,
		DEFAULT_START_TIMEOUT_MS,
	);

	const rawTargetUrl = process.env.TESTER_AGENT_URL?.trim();
	const targetUrl = rawTargetUrl || '';
	const requiredPaths = parseRequiredPaths(
		process.env.TESTER_AGENT_REQUIRED_PATHS,
	);
	const hasPlaywrightCli = hasCommand('playwright-cli');
	const startCommand = process.env.TESTER_AGENT_START_CMD?.trim() || '';
	const sessionName =
		process.env.TESTER_AGENT_SESSION?.trim() ||
		`${DEFAULT_PLAYWRIGHT_SESSION}-${reportStamp}`;

	const playwrightLogDir = await detectPlaywrightLogDir(
		process.env.TESTER_AGENT_PLAYWRIGHT_LOG_DIR?.trim(),
	);
	const logMetricsBefore = await snapshotDirectoryMetrics(playwrightLogDir);

	const findings = [];
	const steps = [];
	const reproduction = [];
	const screenshotPaths = [];
	let startedServer = null;
	let openSessionProcess = null;

	if (!hasPlaywrightCli) {
		const message = 'playwright-cli command is not available in PATH';
		if (enforce) {
			findings.push({ severity: 'P1', detail: message });
			reproduction.push('command -v playwright-cli');
		} else {
			steps.push(`bootstrap-check: ${message}`);
		}
	}

	if (!rawTargetUrl && enforce) {
		findings.push({
			severity: 'P1',
			detail:
				'TESTER_AGENT_URL is required in enforce mode (set explicit URL for deterministic visual verification).',
		});
		reproduction.push('export TESTER_AGENT_URL=http://127.0.0.1:3000');
	}

	const canExecuteVisualFlow =
		hasPlaywrightCli &&
		targetUrl.length > 0 &&
		(!enforce || Boolean(rawTargetUrl));
	if (canExecuteVisualFlow) {
		let urlReachable = await waitForHttpReachability(
			targetUrl,
			4_000,
			timeoutMs,
		);

		if (!urlReachable && startCommand) {
			startedServer = startServer(startCommand);
			steps.push(`start server -> ${startCommand}`);
			urlReachable = await waitForHttpReachability(
				targetUrl,
				startTimeoutMs,
				timeoutMs,
			);
		}

		if (!urlReachable) {
			findings.push({
				severity: 'P1',
				detail: `Target URL is unreachable for tester-agent run: ${targetUrl}`,
			});
			reproduction.push(`curl -I ${targetUrl}`);
		} else {
			openSessionProcess = spawn(
				'playwright-cli',
				['-s=' + sessionName, 'open', targetUrl],
				{
					stdio: 'ignore',
					env: process.env,
				},
			);

			const waitStartedAt = Date.now();
			let sessionReady = false;
			while (Date.now() - waitStartedAt < timeoutMs) {
				const snapshotProbe = runCommand(
					'playwright-cli',
					['-s=' + sessionName, 'snapshot'],
					timeoutMs,
				);
				if (snapshotProbe.ok) {
					sessionReady = true;
					break;
				}
				await sleep(300);
			}

			if (!sessionReady) {
				findings.push({
					severity: 'P1',
					detail: 'Unable to initialize playwright-cli session before timeout.',
				});
				reproduction.push(`playwright-cli -s=${sessionName} open ${targetUrl}`);
			} else {
				for (const [index, requiredPath] of requiredPaths.entries()) {
					const absoluteUrl = toAbsoluteUrl(targetUrl, requiredPath);
					const httpProbe = runCommand(
						'curl',
						[
							'-sS',
							'-o',
							'/dev/null',
							'-w',
							'%{http_code}',
							'--max-time',
							'4',
							absoluteUrl,
						],
						timeoutMs,
					);
					const httpStatus = Number.parseInt(httpProbe.stdout, 10);
					steps.push(
						`http ${absoluteUrl} -> ${Number.isFinite(httpStatus) ? httpStatus : 'unreachable'}`,
					);
					if (!Number.isFinite(httpStatus) || httpStatus >= 400) {
						findings.push({
							severity: 'P1',
							detail: `Route health probe failed for ${absoluteUrl} (status ${httpProbe.stdout || 'n/a'}).`,
						});
						reproduction.push(`curl -i ${absoluteUrl}`);
						continue;
					}

					const gotoResult = runCommand(
						'playwright-cli',
						['-s=' + sessionName, 'goto', absoluteUrl],
						timeoutMs,
					);
					steps.push(
						`goto ${absoluteUrl} -> ${gotoResult.ok ? 'ok' : `failed (${gotoResult.status})`}`,
					);
					if (!gotoResult.ok) {
						findings.push({
							severity: 'P1',
							detail: `Unable to navigate to ${absoluteUrl}: ${gotoResult.stderr || 'unknown error'}`,
						});
						reproduction.push(
							`playwright-cli -s=${sessionName} goto ${absoluteUrl}`,
						);
						continue;
					}

					const snapshotResult = runCommand(
						'playwright-cli',
						['-s=' + sessionName, 'snapshot'],
						timeoutMs,
					);
					steps.push(
						`snapshot ${absoluteUrl} -> ${snapshotResult.ok ? 'ok' : `failed (${snapshotResult.status})`}`,
					);
					if (!snapshotResult.ok) {
						findings.push({
							severity: 'P1',
							detail: `Snapshot failed for ${absoluteUrl}: ${snapshotResult.stderr || 'unknown error'}`,
						});
						reproduction.push(`playwright-cli -s=${sessionName} snapshot`);
					}

					const screenshotPath = path.join(
						reportDir,
						`${reportName.replace('-report.md', '')}-${routeSlug(requiredPath, index)}.png`,
					);
					const screenshotResult = runCommand(
						'playwright-cli',
						['-s=' + sessionName, 'screenshot', '--filename', screenshotPath],
						timeoutMs,
					);
					steps.push(
						`screenshot ${screenshotPath} -> ${screenshotResult.ok ? 'ok' : `failed (${screenshotResult.status})`}`,
					);
					if (!screenshotResult.ok) {
						findings.push({
							severity: 'P1',
							detail: `Screenshot failed for ${absoluteUrl}: ${screenshotResult.stderr || 'unknown error'}`,
						});
						reproduction.push(
							`playwright-cli -s=${sessionName} screenshot --filename ${screenshotPath}`,
						);
						continue;
					}

					try {
						const screenshotStats = await stat(screenshotPath);
						if (screenshotStats.size <= 0) {
							findings.push({
								severity: 'P1',
								detail: `Screenshot file is empty: ${screenshotPath}`,
							});
						} else {
							screenshotPaths.push(screenshotPath);
						}
					} catch {
						findings.push({
							severity: 'P1',
							detail: `Screenshot artifact missing: ${screenshotPath}`,
						});
					}

					const evalResult = runCommand(
						'playwright-cli',
						[
							'-s=' + sessionName,
							'eval',
							'() => ({ title: document.title, body: (document.body && document.body.innerText ? document.body.innerText.slice(0, 1500) : "") })',
						],
						timeoutMs,
					);
					if (!evalResult.ok) {
						findings.push({
							severity: 'P2',
							detail: `Unable to inspect page text for ${absoluteUrl}: ${evalResult.stderr || 'unknown error'}`,
						});
					} else if (!isHealthyPageOutput(evalResult.stdout)) {
						findings.push({
							severity: 'P1',
							detail: `Visual probe detected error-like page content for ${absoluteUrl}.`,
						});
						reproduction.push(
							`playwright-cli -s=${sessionName} eval '() => document.body.innerText'`,
						);
					}
				}
			}
		}
	} else if (!enforce) {
		steps.push(
			'bootstrap-check: playwright-cli run skipped (missing TESTER_AGENT_URL or command)',
		);
	}

	const closeResult = runCommand('playwright-cli', [
		'-s=' + sessionName,
		'close',
	]);
	if (!closeResult.ok && hasPlaywrightCli) {
		steps.push(
			`close ${sessionName} -> ${closeResult.stderr || `failed (${closeResult.status})`}`,
		);
	}

	stopProcess(openSessionProcess);
	stopProcess(startedServer);

	const logMetricsAfter = await snapshotDirectoryMetrics(playwrightLogDir);
	if (requireLogChange) {
		const logAdvanced =
			logMetricsAfter.count > logMetricsBefore.count ||
			logMetricsAfter.newestMs > logMetricsBefore.newestMs;

		if (!logAdvanced) {
			findings.push({
				severity: 'P1',
				detail:
					'Playwright log metrics did not change during tester-agent run; visual checks may not have executed.',
			});
			reproduction.push(`ls -la ${playwrightLogDir}`);
		}
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

	const evidence = {
		stamp: reportStamp,
		runLabel: runLabel || null,
		enforce,
		requireLogChange,
		targetUrl: rawTargetUrl || null,
		requiredPaths,
		sessionName,
		playwrightLogDir,
		logMetricsBefore,
		logMetricsAfter,
		screenshotPaths,
		steps,
		findings,
		hasBlocking,
	};
	await writeFile(
		evidencePath,
		`${JSON.stringify(evidence, null, 2)}\n`,
		'utf8',
	);

	const report = [
		'# Tester-Agent Report',
		'',
		'## Scope',
		'- Gate: `tester-agent:run`',
		'- Canonical prompt source: `AGENTS.md`',
		runLabel ? `- Run label: \`${runLabel}\`` : '',
		`- Enforce mode: ${enforce ? '`yes`' : '`no`'}`,
		`- Target URL: ${rawTargetUrl ? `\`${rawTargetUrl}\`` : '`not provided`'}`,
		`- Required paths: \`${requiredPaths.join(',')}\``,
		`- Execution mode: ${hasPlaywrightCli ? '`playwright-cli available`' : '`playwright-cli missing`'}`,
		`- Playwright log dir: \`${playwrightLogDir}\``,
		`- Evidence file: \`${evidencePath}\``,
		'',
		'## Steps',
		...steps.map((step) => `- ${step}`),
		'',
		'## Screenshots',
		...(screenshotPaths.length > 0
			? screenshotPaths.map((screenshotPath) => `- ${screenshotPath}`)
			: ['- None']),
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
