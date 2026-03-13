import { spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import {
	access,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_ROOT = process.cwd();
const SPEC_FRAGMENTER = path.join(SCRIPT_ROOT, 'scripts/spec-fragmenter.mjs');
const TICKETS_SYNC = path.join(SCRIPT_ROOT, 'scripts/tickets-sync.mjs');
const TICKETS_TO_QUEUE = path.join(SCRIPT_ROOT, 'scripts/tickets-to-queue.mjs');
const RALPH_LOOP = path.join(SCRIPT_ROOT, 'scripts/ralph-loop.mjs');
const RALPH_PROMPT_TEMPLATE = path.join(
	SCRIPT_ROOT,
	'docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md',
);

function runNode(scriptPath: string, args: string[], cwd: string, env = {}) {
	return spawnSync('node', [scriptPath, ...args], {
		cwd,
		env: { ...process.env, ...env },
		encoding: 'utf8',
	});
}

describe('HARNESS-RALPH-002', () => {
	const tempRoots: string[] = [];

	afterEach(async () => {
		await Promise.all(
			tempRoots.map((entry) => rm(entry, { recursive: true, force: true })),
		);
		tempRoots.length = 0;
	});

	it('keeps docker wrapper executable', async () => {
		await access(
			path.join(SCRIPT_ROOT, 'scripts/ralph-docker-loop.sh'),
			constants.X_OK,
		);
	});

	it('generates ticket files and matrix from spec, then builds queue from active statuses', async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ralph-ticketing-'));
		tempRoots.push(tempRoot);

		await mkdir(path.join(tempRoot, 'docs/spec'), { recursive: true });
		await writeFile(
			path.join(tempRoot, 'docs/spec/EPICS_AND_USER_STORIES.md'),
			[
				'# Backlog',
				'',
				'## Epic Overview',
				'| ID | Name | Outcome |',
				'| --- | --- | --- |',
				'| `E1` | Platform | Queue-driven local execution |',
				'',
				'## User Stories',
				'| ID | User Story | Acceptance | Depends On | Parallel Group |',
				'| --- | --- | --- | --- | --- |',
				'| `E1-S1` | As owner, I want generated tickets, so that queueing is deterministic. | Ticket files are generated. | `-` | `G-A` |',
				'| `E1-S2` | As owner, I want active-only queueing, so that only ready work runs. | Queue excludes backlog stories. | `E1-S1` | `G-A` |',
				'',
			].join('\n'),
			'utf8',
		);

		const fragmentResult = runNode(SPEC_FRAGMENTER, [], tempRoot);
		expect(fragmentResult.status, fragmentResult.stderr).toBe(0);

		await access(path.join(tempRoot, 'tickets/epics/E1.md'), constants.F_OK);
		await access(
			path.join(tempRoot, 'tickets/user-stories/E1-S1.md'),
			constants.F_OK,
		);
		await access(
			path.join(tempRoot, 'tickets/user-stories/E1-S2.md'),
			constants.F_OK,
		);

		const storyTwoPath = path.join(tempRoot, 'tickets/user-stories/E1-S2.md');
		const storyTwoRaw = await readFile(storyTwoPath, 'utf8');
		await writeFile(
			storyTwoPath,
			storyTwoRaw.replace('status: ready', 'status: backlog'),
			'utf8',
		);

		const matrixResult = runNode(TICKETS_SYNC, [], tempRoot);
		expect(matrixResult.status, matrixResult.stderr).toBe(0);

		const queuePath = path.join(tempRoot, 'artifacts/ralph/task-queue.json');
		const queueResult = runNode(TICKETS_TO_QUEUE, [], tempRoot, {
			RALPH_QUEUE_PATH: queuePath,
			TICKETS_QUEUE_STATUSES: 'ready,in_progress',
		});
		expect(queueResult.status, queueResult.stderr).toBe(0);

		const matrix = await readFile(
			path.join(tempRoot, 'tickets/MATRIX.md'),
			'utf8',
		);
		expect(matrix).toContain('| E1-S1 | user_story |');
		expect(matrix).toContain('| E1-S2 | user_story |');

		const queue = JSON.parse(await readFile(queuePath, 'utf8'));
		expect(queue.items).toHaveLength(1);
		expect(queue.items[0].id).toBe('E1-S1');
		expect(queue.items[0].status).toBe('pending');
		expect(queue.items[0].source).toBe('tickets/user-stories/E1-S1.md');
	});

	it('marks queue item failed on verification failure and emits task artifacts', async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ralph-loop-'));
		tempRoots.push(tempRoot);

		await writeFile(path.join(tempRoot, 'AGENTS.md'), '# temp\n', 'utf8');
		await mkdir(path.join(tempRoot, 'artifacts/ralph'), { recursive: true });

		const queuePath = path.join(tempRoot, 'artifacts/ralph/task-queue.json');
		await writeFile(
			queuePath,
			`${JSON.stringify(
				{
					version: 'v1',
					source: 'test',
					generatedAt: '2026-03-05T00:00:00.000Z',
					items: [
						{
							id: 'E7-S6',
							type: 'user_story',
							title:
								'As platform owner, I want queue-driven orchestration, so that deterministic verification is enforced.',
							goal: 'Ensure verify failures are persisted to queue state.',
							scope: ['G-A'],
							nonGoals: ['none'],
							invariants: ['INV-5'],
							acceptance: ['verify failure marks item failed'],
							status: 'pending',
							attempts: 0,
							source: 'tickets/user-stories/E7-S6.md',
						},
					],
				},
				null,
				2,
			)}\n`,
			'utf8',
		);

		const agentTemplate =
			'node -e "const fs=require(\'node:fs\');const p=process.argv[1];const s=fs.readFileSync(p,\'utf8\');const m=s.match(/AGENTS_ACK:[A-Za-z0-9:-]+/);if(!m){process.exit(7);}process.stdout.write(m[0]);" "{{TASK_PROMPT_FILE}}"';
		const loopResult = runNode(RALPH_LOOP, ['--once'], tempRoot, {
			RALPH_QUEUE_PATH: queuePath,
			RALPH_ARTIFACTS_DIR: path.join(tempRoot, 'artifacts/ralph'),
			RALPH_PROMPT_TEMPLATE_PATH: RALPH_PROMPT_TEMPLATE,
			RALPH_AGENT_CMD_TEMPLATE: agentTemplate,
			RALPH_REQUIRE_AGENTS_ACK: '1',
			RALPH_REQUIRE_VISUAL_GUARD: '0',
			RALPH_VERIFY_CMD: 'false',
			RALPH_AUTO_COMMIT: '0',
		});
		expect(loopResult.status, loopResult.stderr).toBe(1);

		const queue = JSON.parse(await readFile(queuePath, 'utf8'));
		expect(queue.items).toHaveLength(1);

		const [item] = queue.items;
		expect(item.status).toBe('failed');
		expect(item.attempts).toBe(1);
		expect(String(item.lastError)).toContain('verify command failed');
		expect(item.lastLogs?.agentLogPath).toBeTruthy();
		expect(item.lastLogs?.verifyLogPath).toBeTruthy();

		await access(item.lastLogs.agentLogPath, constants.F_OK);
		await access(item.lastLogs.verifyLogPath, constants.F_OK);

		const promptFiles = await readdir(
			path.join(tempRoot, 'artifacts/ralph/prompts'),
		);
		const taskPayloadFiles = await readdir(
			path.join(tempRoot, 'artifacts/ralph/tasks'),
		);
		const taskBriefFiles = await readdir(
			path.join(tempRoot, 'artifacts/task-briefs'),
		);
		expect(promptFiles.length).toBeGreaterThan(0);
		expect(taskPayloadFiles.length).toBeGreaterThan(0);
		expect(taskBriefFiles.length).toBeGreaterThan(0);
	});
});
