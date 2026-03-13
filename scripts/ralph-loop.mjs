import { spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_QUEUE_PATH = 'artifacts/ralph/task-queue.json';
const DEFAULT_ARTIFACTS_DIR = 'artifacts/ralph';
const DEFAULT_PROMPT_TEMPLATE_PATH = 'docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md';
const AGENTS_ACK_ENV = 'RALPH_REQUIRE_AGENTS_ACK';
const DEFAULT_TESTER_AGENT_URL = 'http://127.0.0.1:3000';
const DEFAULT_VERIFY_CMD =
	'pnpm cq:check && pnpm test:spec-consistency && pnpm test:unit && pnpm test:integration && pnpm test:contract && pnpm test:security && pnpm test:harness';

function parseArgs(argv) {
	const options = {
		once: false,
		maxItems: Number.POSITIVE_INFINITY,
		continueOnFail: process.env.RALPH_CONTINUE_ON_FAIL === '1',
		queuePath: process.env.RALPH_QUEUE_PATH || DEFAULT_QUEUE_PATH,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--once') {
			options.once = true;
			continue;
		}
		if (arg === '--continue-on-fail') {
			options.continueOnFail = true;
			continue;
		}
		if (arg === '--queue') {
			const value = argv[index + 1];
			if (!value) {
				throw new Error('Missing value for --queue');
			}
			options.queuePath = value;
			index += 1;
			continue;
		}
		if (arg === '--max-items') {
			const value = argv[index + 1];
			if (!value) {
				throw new Error('Missing value for --max-items');
			}
			const parsed = Number.parseInt(value, 10);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				throw new Error('--max-items must be a positive integer');
			}
			options.maxItems = parsed;
			index += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	if (options.once) {
		options.maxItems = 1;
	}

	return options;
}

function isoTimestamp() {
	return new Date().toISOString();
}

function fileTimestamp() {
	return isoTimestamp()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}Z$/, 'Z');
}

function unique(values) {
	return [...new Set(values)];
}

function slugify(value) {
	return String(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function renderTemplate(template, replacements) {
	let output = template;
	for (const [key, value] of Object.entries(replacements)) {
		output = output.split(`{{${key}}}`).join(value);
	}
	return output;
}

function toBulletList(values, fallback = '- not provided') {
	if (!Array.isArray(values) || values.length === 0) {
		return fallback;
	}
	return values.map((entry) => `- ${entry}`).join('\n');
}

function buildAgentsAckToken(item, stamp) {
	return `AGENTS_ACK:${item.id}:${stamp}`;
}

function runCommand(command) {
	const result = spawnSync('sh', ['-lc', command], {
		encoding: 'utf8',
		maxBuffer: 10 * 1024 * 1024,
	});

	return {
		status: result.status ?? 1,
		ok: result.status === 0,
		stdout: (result.stdout || '').trim(),
		stderr: (result.stderr || '').trim(),
	};
}

function parsePorcelainChangedFiles(statusOutput) {
	return statusOutput
		.split('\n')
		.map((line) => line.trimEnd())
		.filter(Boolean)
		.map((line) => line.slice(3).trim())
		.map((entry) => {
			const renameParts = entry.split(' -> ');
			return renameParts[renameParts.length - 1];
		})
		.filter((entry) => entry.length > 0);
}

function getWorkingTreeChangedFiles() {
	const statusResult = runCommand('git status --porcelain');
	if (!statusResult.ok) {
		return {
			ok: false,
			error: statusResult.stderr || statusResult.stdout || 'git status failed',
			changedFiles: [],
		};
	}

	return {
		ok: true,
		changedFiles: parsePorcelainChangedFiles(statusResult.stdout),
	};
}

function inferVisualGuardPaths(changedFiles) {
	const required = new Set(['/']);

	for (const file of changedFiles) {
		if (
			file.startsWith('src/app/projects/') ||
			file.startsWith('src/components/projects/') ||
			file.startsWith('src/lib/storyblok/project')
		) {
			required.add('/projects/alpha');
		}
		if (
			file.startsWith('src/app/writing/') ||
			file.startsWith('src/components/writing/') ||
			file.startsWith('src/lib/storyblok/writing')
		) {
			required.add('/writing/hello-world');
		}
		if (
			file.startsWith('src/app/') ||
			file.startsWith('src/components/home/') ||
			file.startsWith('src/lib/storyblok/home-page')
		) {
			required.add('/');
		}
	}

	return [...required];
}

function runVisualGuardForTask(itemRef, changedFiles) {
	if (process.env.RALPH_REQUIRE_VISUAL_GUARD === '0') {
		return {
			ok: true,
			skipped: true,
			reason: 'RALPH_REQUIRE_VISUAL_GUARD=0',
			command: '',
			requiredPaths: [],
		};
	}

	if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
		return {
			ok: true,
			skipped: true,
			reason: 'no working tree changes detected',
			command: '',
			requiredPaths: [],
		};
	}

	const requiredPaths = inferVisualGuardPaths(changedFiles);
	const testerAgentUrl =
		process.env.TESTER_AGENT_URL ||
		process.env.RALPH_TESTER_AGENT_URL ||
		DEFAULT_TESTER_AGENT_URL;
	const visualGuardTemplate =
		process.env.RALPH_VISUAL_GUARD_CMD || 'pnpm run tester-agent:run';
	const playwrightLogDir =
		process.env.RALPH_PLAYWRIGHT_LOG_DIR ||
		process.env.TESTER_AGENT_PLAYWRIGHT_LOG_DIR ||
		'.playwright-cli';
	const visualGuardCommand = renderTemplate(visualGuardTemplate, {
		TASK_ID: itemRef.id,
		TESTER_AGENT_REQUIRED_PATHS: requiredPaths.join(','),
		TESTER_AGENT_URL: testerAgentUrl,
	});
	const environmentPrefix = [
		'TESTER_AGENT_ENFORCE=1',
		`TESTER_AGENT_URL=${shellQuote(testerAgentUrl)}`,
		`TESTER_AGENT_REQUIRED_PATHS=${shellQuote(requiredPaths.join(','))}`,
		`TESTER_AGENT_REQUIRE_PLAYWRIGHT_LOG_CHANGE=${shellQuote(process.env.TESTER_AGENT_REQUIRE_PLAYWRIGHT_LOG_CHANGE || '1')}`,
		`TESTER_AGENT_PLAYWRIGHT_LOG_DIR=${shellQuote(playwrightLogDir)}`,
		`TESTER_AGENT_RUN_LABEL=${shellQuote(itemRef.id)}`,
	].join(' ');
	const command = `${environmentPrefix} ${visualGuardCommand}`;
	const result = runCommand(command);

	return {
		...result,
		command,
		requiredPaths,
		skipped: false,
	};
}

function shellQuote(value) {
	return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function singleLine(value) {
	return String(value || '')
		.replace(/\s+/g, ' ')
		.trim();
}

function extractWantClause(title) {
	const match = String(title || '').match(
		/i want\s+(.+?)(?:,\s*so that|\.?$)/i,
	);
	return match ? singleLine(match[1]) : '';
}

function extractOutcomeClause(title) {
	const match = String(title || '').match(/so that\s+(.+?)[.]?$/i);
	return match ? singleLine(match[1]) : '';
}

function inferCommitScope(changedFiles) {
	const prefixByScope = new Map([
		['ralph', ['scripts/ralph-']],
		[
			'storyblok',
			['src/lib/storyblok/', 'data/storyblok/', 'data/contentful-export/'],
		],
		['app', ['src/app/']],
		['harness', ['tests/harness/', 'tests/conformance/']],
		['tests', ['tests/']],
		['docs', ['docs/']],
		['tickets', ['tickets/']],
		['scripts', ['scripts/']],
		['blueprint', ['blueprints/']],
	]);

	const scores = new Map();
	for (const file of changedFiles) {
		for (const [scope, prefixes] of prefixByScope.entries()) {
			if (prefixes.some((prefix) => file.startsWith(prefix))) {
				scores.set(scope, (scores.get(scope) || 0) + 1);
			}
		}
	}

	if (scores.size === 0) {
		return 'repo';
	}

	return [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function inferCommitType(item, changedFiles) {
	const onlyDocsOrTickets =
		changedFiles.length > 0 &&
		changedFiles.every(
			(file) => file.startsWith('docs/') || file.startsWith('tickets/'),
		);
	if (onlyDocsOrTickets) {
		return 'docs';
	}

	const onlyTests =
		changedFiles.length > 0 &&
		changedFiles.every((file) => file.startsWith('tests/'));
	if (onlyTests) {
		return 'test';
	}

	const taskType = String(item.type || '').toLowerCase();
	if (taskType === 'bug') {
		return 'fix';
	}
	if (taskType === 'user_story') {
		return 'feat';
	}
	return 'chore';
}

function normalizeCommitAction(item) {
	const storyAction = extractWantClause(item.title);
	const base = singleLine(storyAction || item.goal || item.title || item.id);
	if (!base) {
		return 'apply task changes';
	}

	const normalized = base
		.replace(/\bconfigured\b/gi, 'configuration')
		.replace(/\binitialized\b/gi, 'initialization')
		.replace(/\benforced\b/gi, 'enforcement')
		.replace(/\bcreated\b/gi, 'creation')
		.replace(/\bupdated\b/gi, 'updates')
		.replace(/[.]+$/, '');

	const startsWithVerb =
		/^(add|update|fix|enable|configure|create|implement|enforce|migrate|bootstrap|wire|refactor)\b/i.test(
			normalized,
		);
	return startsWithVerb ? normalized : `implement ${normalized}`;
}

function buildTaskCommitMessage(item, { changedFiles, verifyCommand }) {
	const commitType = inferCommitType(item, changedFiles);
	const commitScope = inferCommitScope(changedFiles);
	const action = normalizeCommitAction(item);
	const suffix = ` (${item.id})`;
	const prefix = `${commitType}(${commitScope}): `;
	const maxSubjectLength = 72;
	const maxActionLength = Math.max(
		16,
		maxSubjectLength - prefix.length - suffix.length,
	);
	const subject = `${prefix}${action.slice(0, maxActionLength)}${suffix}`;

	const goalLine = singleLine(item.goal || item.title || item.id);
	const whyLine = extractOutcomeClause(item.title);
	const listedFiles = changedFiles.slice(0, 8);
	const remainingCount = Math.max(0, changedFiles.length - listedFiles.length);

	const body = [
		`Task: ${item.id}`,
		`Goal: ${goalLine}`,
		whyLine ? `Why: ${whyLine}` : '',
		'Changes:',
		...listedFiles.map((file) => `- ${file}`),
		remainingCount > 0 ? `- ...and ${remainingCount} more file(s)` : '',
		'Validation:',
		`- ${verifyCommand}`,
	]
		.filter(Boolean)
		.join('\n');

	return { subject, body };
}

function autoCommitTask(itemRef, verifyCommand) {
	if (process.env.RALPH_AUTO_COMMIT === '0') {
		return { ok: true, skipped: true };
	}

	const gitUserName =
		process.env.RALPH_GIT_USER_NAME ||
		process.env.GIT_AUTHOR_NAME ||
		process.env.GIT_COMMITTER_NAME ||
		'Ralph Loop Bot';
	const gitUserEmail =
		process.env.RALPH_GIT_USER_EMAIL ||
		process.env.GIT_AUTHOR_EMAIL ||
		process.env.GIT_COMMITTER_EMAIL ||
		'ralph-loop@local';

	process.env.GIT_AUTHOR_NAME = process.env.GIT_AUTHOR_NAME || gitUserName;
	process.env.GIT_AUTHOR_EMAIL = process.env.GIT_AUTHOR_EMAIL || gitUserEmail;
	process.env.GIT_COMMITTER_NAME =
		process.env.GIT_COMMITTER_NAME || gitUserName;
	process.env.GIT_COMMITTER_EMAIL =
		process.env.GIT_COMMITTER_EMAIL || gitUserEmail;

	const insideRepo = runCommand('git rev-parse --is-inside-work-tree');
	if (!insideRepo.ok) {
		return {
			ok: false,
			error: 'auto-commit failed: not inside a git repository',
			detail: insideRepo.stderr || insideRepo.stdout,
		};
	}

	const statusResult = runCommand('git status --porcelain');
	if (!statusResult.ok) {
		return {
			ok: false,
			error: 'auto-commit failed: unable to read git status',
			detail: statusResult.stderr || statusResult.stdout,
		};
	}

	if (!statusResult.stdout.trim()) {
		return { ok: true, skipped: true };
	}

	const stageResult = runCommand('git add -A');
	if (!stageResult.ok) {
		return {
			ok: false,
			error: `auto-commit failed while staging changes (exit ${stageResult.status})`,
			detail: [stageResult.stdout, stageResult.stderr]
				.filter(Boolean)
				.join('\n'),
		};
	}

	const stagedFilesResult = runCommand('git diff --cached --name-only');
	if (!stagedFilesResult.ok) {
		return {
			ok: false,
			error: 'auto-commit failed: unable to read staged file list',
			detail: stagedFilesResult.stderr || stagedFilesResult.stdout,
		};
	}

	const changedFiles = stagedFilesResult.stdout
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	if (changedFiles.length === 0) {
		return { ok: true, skipped: true };
	}

	const { subject: commitSubject, body: commitBody } = buildTaskCommitMessage(
		itemRef,
		{
			changedFiles,
			verifyCommand,
		},
	);
	const commitCommand = `git commit -m ${shellQuote(commitSubject)} -m ${shellQuote(commitBody)}`;
	const commitResult = runCommand(commitCommand);
	if (!commitResult.ok) {
		return {
			ok: false,
			error: `auto-commit failed (exit ${commitResult.status})`,
			detail: [commitResult.stdout, commitResult.stderr]
				.filter(Boolean)
				.join('\n'),
		};
	}

	const commitSha = runCommand('git rev-parse --short HEAD');
	return {
		ok: true,
		skipped: false,
		commitSubject,
		commitBody,
		commitSha: commitSha.ok ? commitSha.stdout : '',
	};
}

function ensureQueueSchema(queue) {
	if (!queue || typeof queue !== 'object') {
		throw new Error('Queue file must contain a JSON object');
	}
	if (!Array.isArray(queue.items)) {
		throw new Error('Queue file must contain an items array');
	}

	queue.items.forEach((item, index) => {
		if (typeof item?.id !== 'string' || item.id.length === 0) {
			throw new Error(`Queue item at index ${index} missing non-empty id`);
		}
		if (typeof item?.title !== 'string' || item.title.length === 0) {
			throw new Error(`Queue item ${item.id} missing non-empty title string`);
		}
		if (!Array.isArray(item?.invariants) || item.invariants.length === 0) {
			throw new Error(
				`Queue item ${item.id} must define at least one invariant`,
			);
		}
	});
}

async function writeJsonAtomic(filePath, payload) {
	const dir = path.dirname(filePath);
	await mkdir(dir, { recursive: true });
	const tmp = `${filePath}.tmp`;
	await writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
	await rename(tmp, filePath);
}

function buildTaskBrief(item) {
	const scope = toBulletList(item.scope);
	const nonGoals = toBulletList(item.nonGoals);
	const acceptance = toBulletList(item.acceptance);
	const invariants = toBulletList(item.invariants);

	return [
		'Goal:',
		item.goal || item.title,
		'',
		'Scope:',
		scope,
		'',
		'Non-goals:',
		nonGoals,
		'',
		'Invariants:',
		invariants,
		'',
		'Acceptance:',
		acceptance,
		'',
	].join('\n');
}

function buildAgentPrompt({
	item,
	taskBriefPath,
	queuePath,
	taskJsonPath,
	taskPromptPath,
	promptTemplatePath,
	promptTemplate,
	agentsAckToken,
}) {
	const prompt = renderTemplate(promptTemplate, {
		TASK_ID: item.id,
		TASK_TYPE: item.type || 'user_story',
		TASK_TITLE: item.title,
		TASK_GOAL: item.goal || item.title,
		TASK_SCOPE_BULLETS: toBulletList(item.scope),
		TASK_NON_GOALS_BULLETS: toBulletList(item.nonGoals),
		TASK_INVARIANTS_BULLETS: toBulletList(item.invariants),
		TASK_ACCEPTANCE_BULLETS: toBulletList(item.acceptance),
		TASK_BRIEF_FILE: taskBriefPath,
		TASK_JSON_FILE: taskJsonPath,
		TASK_PROMPT_FILE: taskPromptPath,
		RALPH_QUEUE_FILE: queuePath,
		RALPH_PROMPT_TEMPLATE_FILE: promptTemplatePath,
		AGENTS_ACK_TOKEN: agentsAckToken,
	});

	const unresolved = unique(
		[...prompt.matchAll(/{{([A-Z0-9_]+)}}/g)].map((match) => match[1]),
	);
	if (unresolved.length > 0) {
		throw new Error(
			`Prompt template contains unresolved placeholders: ${unresolved.join(', ')}`,
		);
	}

	return prompt;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const queuePath = options.queuePath;
	const promptTemplatePath =
		process.env.RALPH_PROMPT_TEMPLATE_PATH || DEFAULT_PROMPT_TEMPLATE_PATH;
	const requireAgentsAck = process.env[AGENTS_ACK_ENV] !== '0';

	await access('AGENTS.md', constants.F_OK);
	await access(queuePath, constants.F_OK);
	await access(promptTemplatePath, constants.F_OK);

	const [queueRaw, promptTemplate] = await Promise.all([
		readFile(queuePath, 'utf8'),
		readFile(promptTemplatePath, 'utf8'),
	]);
	const queue = JSON.parse(queueRaw);
	ensureQueueSchema(queue);

	const artifactsDir = process.env.RALPH_ARTIFACTS_DIR || DEFAULT_ARTIFACTS_DIR;
	const promptsDir = path.join(artifactsDir, 'prompts');
	const logsDir = path.join(artifactsDir, 'logs');
	const taskPayloadDir = path.join(artifactsDir, 'tasks');
	const taskBriefDir = 'artifacts/task-briefs';

	await Promise.all([
		mkdir(promptsDir, { recursive: true }),
		mkdir(logsDir, { recursive: true }),
		mkdir(taskPayloadDir, { recursive: true }),
		mkdir(taskBriefDir, { recursive: true }),
	]);

	const template = process.env.RALPH_AGENT_CMD_TEMPLATE;
	if (!template) {
		throw new Error(
			'Missing RALPH_AGENT_CMD_TEMPLATE. Example: RALPH_AGENT_CMD_TEMPLATE="codex exec --prompt-file {{TASK_PROMPT_FILE}}"',
		);
	}

	const verifyCommand = process.env.RALPH_VERIFY_CMD || DEFAULT_VERIFY_CMD;

	const pending = queue.items.filter(
		(item) => (item.status || 'pending') === 'pending',
	);
	if (pending.length === 0) {
		console.log(`ralph-loop: no pending tasks in ${queuePath}`);
		return;
	}

	const selected = pending.slice(0, options.maxItems);
	let processed = 0;
	let failed = 0;

	for (const item of selected) {
		const itemRef = queue.items.find((entry) => entry.id === item.id);
		if (!itemRef) {
			continue;
		}

		const attempt = Number(itemRef.attempts || 0) + 1;
		const stamp = fileTimestamp();
		const slug = slugify(`${itemRef.id}-${itemRef.title}`);

		itemRef.status = 'in_progress';
		itemRef.attempts = attempt;
		itemRef.startedAt = isoTimestamp();
		await writeJsonAtomic(queuePath, queue);

		const taskBriefPath = path.join(taskBriefDir, `${stamp}-${slug}.md`);
		const taskPromptPath = path.join(promptsDir, `${stamp}-${slug}.md`);
		const taskJsonPath = path.join(taskPayloadDir, `${stamp}-${slug}.json`);
		const agentLogPath = path.join(logsDir, `${stamp}-${slug}-agent.log`);
		const visualLogPath = path.join(logsDir, `${stamp}-${slug}-visual.log`);
		const verifyLogPath = path.join(logsDir, `${stamp}-${slug}-verify.log`);
		const commitLogPath = path.join(logsDir, `${stamp}-${slug}-commit.log`);
		const agentsAckToken = buildAgentsAckToken(itemRef, stamp);

		await writeFile(taskBriefPath, buildTaskBrief(itemRef), 'utf8');
		await writeFile(
			taskPromptPath,
			buildAgentPrompt({
				item: itemRef,
				taskBriefPath,
				queuePath,
				taskJsonPath,
				taskPromptPath,
				promptTemplatePath,
				promptTemplate,
				agentsAckToken,
			}),
			'utf8',
		);
		await writeFile(
			taskJsonPath,
			`${JSON.stringify(itemRef, null, 2)}\n`,
			'utf8',
		);

		const agentCommand = renderTemplate(template, {
			TASK_ID: itemRef.id,
			TASK_TITLE: itemRef.title,
			TASK_PROMPT_FILE: taskPromptPath,
			TASK_BRIEF_FILE: taskBriefPath,
			TASK_JSON_FILE: taskJsonPath,
		});

		const agentResult = runCommand(agentCommand);
		await writeFile(
			agentLogPath,
			[
				`command: ${agentCommand}`,
				`exit: ${agentResult.status}`,
				`requiredAgentsAckToken: ${agentsAckToken}`,
				'',
				'--- stdout ---',
				agentResult.stdout,
				'',
				'--- stderr ---',
				agentResult.stderr,
				'',
			].join('\n'),
			'utf8',
		);

		if (!agentResult.ok) {
			itemRef.status = 'failed';
			itemRef.finishedAt = isoTimestamp();
			itemRef.lastError = `agent command failed (exit ${agentResult.status})`;
			itemRef.lastLogs = {
				agentLogPath,
			};
			failed += 1;
			await writeJsonAtomic(queuePath, queue);
			if (!options.continueOnFail) {
				break;
			}
			continue;
		}

		const combinedOutput = `${agentResult.stdout}\n${agentResult.stderr}`;
		if (requireAgentsAck && !combinedOutput.includes(agentsAckToken)) {
			itemRef.status = 'failed';
			itemRef.finishedAt = isoTimestamp();
			itemRef.lastError = `agent did not emit required AGENTS ack token (${agentsAckToken})`;
			itemRef.lastLogs = {
				agentLogPath,
			};
			failed += 1;
			await writeJsonAtomic(queuePath, queue);
			if (!options.continueOnFail) {
				break;
			}
			continue;
		}

		let changedFilesResult = {
			ok: true,
			changedFiles: [],
			error: '',
		};
		if (process.env.RALPH_REQUIRE_VISUAL_GUARD !== '0') {
			changedFilesResult = getWorkingTreeChangedFiles();
			if (!changedFilesResult.ok) {
				itemRef.status = 'failed';
				itemRef.finishedAt = isoTimestamp();
				itemRef.lastError = `visual guard preflight failed: ${changedFilesResult.error}`;
				itemRef.lastLogs = {
					agentLogPath,
				};
				failed += 1;
				await writeJsonAtomic(queuePath, queue);
				if (!options.continueOnFail) {
					break;
				}
				continue;
			}
		}

		const visualGuardResult = runVisualGuardForTask(
			itemRef,
			changedFilesResult.changedFiles,
		);
		await writeFile(
			visualLogPath,
			[
				`command: ${visualGuardResult.command || '(skipped)'}`,
				`exit: ${visualGuardResult.status ?? 0}`,
				`skipped: ${visualGuardResult.skipped === true}`,
				`reason: ${visualGuardResult.reason || ''}`,
				`requiredPaths: ${(visualGuardResult.requiredPaths || []).join(',')}`,
				`changedFiles: ${changedFilesResult.changedFiles.join(',')}`,
				'',
				'--- stdout ---',
				visualGuardResult.stdout || '',
				'',
				'--- stderr ---',
				visualGuardResult.stderr || '',
				'',
			].join('\n'),
			'utf8',
		);

		if (!visualGuardResult.ok) {
			itemRef.status = 'failed';
			itemRef.finishedAt = isoTimestamp();
			itemRef.lastError = `visual guard failed (exit ${visualGuardResult.status})`;
			itemRef.lastLogs = {
				agentLogPath,
				visualLogPath,
			};
			failed += 1;
			await writeJsonAtomic(queuePath, queue);
			if (!options.continueOnFail) {
				break;
			}
			continue;
		}

		const verifyResult = runCommand(verifyCommand);
		await writeFile(
			verifyLogPath,
			[
				`command: ${verifyCommand}`,
				`exit: ${verifyResult.status}`,
				'',
				'--- stdout ---',
				verifyResult.stdout,
				'',
				'--- stderr ---',
				verifyResult.stderr,
				'',
			].join('\n'),
			'utf8',
		);

		itemRef.finishedAt = isoTimestamp();
		itemRef.lastLogs = {
			agentLogPath,
			visualLogPath,
			verifyLogPath,
		};

		if (!verifyResult.ok) {
			itemRef.status = 'failed';
			itemRef.lastError = `verify command failed (exit ${verifyResult.status})`;
			failed += 1;
			await writeJsonAtomic(queuePath, queue);
			if (!options.continueOnFail) {
				break;
			}
			continue;
		}

		itemRef.status = 'done';
		itemRef.lastError = null;
		await writeJsonAtomic(queuePath, queue);

		const commitResult = autoCommitTask(itemRef, verifyCommand);
		await writeFile(
			commitLogPath,
			[
				`autoCommitEnabled: ${process.env.RALPH_AUTO_COMMIT !== '0'}`,
				`ok: ${commitResult.ok}`,
				`skipped: ${commitResult.skipped === true}`,
				`commitSha: ${commitResult.commitSha || ''}`,
				`commitSubject: ${commitResult.commitSubject || ''}`,
				'',
				'--- commit body ---',
				commitResult.commitBody || '',
				'',
				'--- detail ---',
				commitResult.detail || '',
				'',
			].join('\n'),
			'utf8',
		);

		itemRef.lastLogs = {
			agentLogPath,
			visualLogPath,
			verifyLogPath,
			commitLogPath,
		};

		if (!commitResult.ok) {
			itemRef.status = 'failed';
			itemRef.lastError = commitResult.error || 'auto-commit failed';
			failed += 1;
			await writeJsonAtomic(queuePath, queue);
			if (!options.continueOnFail) {
				break;
			}
			continue;
		}

		processed += 1;
	}

	const summary = [
		`processed=${processed}`,
		`failed=${failed}`,
		`remaining=${queue.items.filter((item) => (item.status || 'pending') === 'pending').length}`,
	].join(' ');
	console.log(`ralph-loop complete (${summary})`);

	if (failed > 0) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error(`ralph-loop failed: ${error.message}`);
	process.exit(1);
});
