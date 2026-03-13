import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('HARNESS-RALPH-001', () => {
	it('keeps ralph loop scripts and docker sandbox contract wired for sequential queue execution', async () => {
		await access('scripts/ralph-loop.mjs', constants.F_OK);
		await access('scripts/ralph-docker-loop.sh', constants.F_OK);
		await access('scripts/ralph-agent-runner.sh', constants.F_OK);
		await access('docker/ralph-sandbox/Dockerfile', constants.F_OK);
		await access('scripts/tickets-to-queue.mjs', constants.F_OK);
		await access('docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md', constants.F_OK);
		await access('CLAUDE.md', constants.F_OK);

		const [
			loopScript,
			dockerScript,
			dockerImageDefinition,
			engineScript,
			packageJson,
			claudeShim,
			ralphTemplate,
		] = await Promise.all([
			readFile('scripts/ralph-loop.mjs', 'utf8'),
			readFile('scripts/ralph-docker-loop.sh', 'utf8'),
			readFile('docker/ralph-sandbox/Dockerfile', 'utf8'),
			readFile('scripts/ralph-agent-runner.sh', 'utf8'),
			readFile('package.json', 'utf8'),
			readFile('CLAUDE.md', 'utf8'),
			readFile('docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md', 'utf8'),
		]);

		expect(loopScript).toContain("await access('AGENTS.md'");
		expect(loopScript).toContain('RALPH_AGENT_CMD_TEMPLATE');
		expect(loopScript).toContain('RALPH_PROMPT_TEMPLATE_PATH');
		expect(loopScript).toContain('RALPH_REQUIRE_AGENTS_ACK');
		expect(loopScript).toContain('RALPH_REQUIRE_VISUAL_GUARD');
		expect(loopScript).toContain('runVisualGuardForTask');
		expect(loopScript).toContain('TESTER_AGENT_ENFORCE=1');
		expect(loopScript).toContain('TESTER_AGENT_REQUIRED_PATHS');
		expect(loopScript).toContain('TESTER_AGENT_REQUIRE_PLAYWRIGHT_LOG_CHANGE');
		expect(loopScript).toContain('TESTER_AGENT_PLAYWRIGHT_LOG_DIR');
		expect(loopScript).toContain('visual guard failed');
		expect(loopScript).toContain('AGENTS_ACK:');
		expect(loopScript).toContain('docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md');
		expect(loopScript).toContain('artifacts/task-briefs');

		expect(dockerScript).toContain('docker/ralph-sandbox/Dockerfile');
		expect(dockerScript).toContain('node scripts/ralph-loop.mjs');
		expect(dockerScript).toContain('RALPH_REQUIRE_AGENTS_ACK');
		expect(dockerScript).toContain('RALPH_DOCKER_MODE');
		expect(dockerScript).toContain('isolated');
		expect(dockerScript).toContain('RALPH_DOCKER_SYNC_BACK');
		expect(dockerScript).toContain('RALPH_DOCKER_USER');
		expect(dockerScript).toContain('RALPH_DOCKER_SHARE_CLAUDE_AUTH');
		expect(dockerScript).toContain('RALPH_DOCKER_CLAUDE_DIR');
		expect(dockerScript).toContain('RALPH_DOCKER_CLAUDE_STATE_FILE');
		expect(dockerScript).toContain('RALPH_DOCKER_SHARE_CODEX_AUTH');
		expect(dockerScript).toContain('RALPH_DOCKER_CODEX_HOME');
		expect(dockerScript).toContain('/tmp/.claude');
		expect(dockerScript).toContain('/tmp/.codex');
		expect(dockerImageDefinition).toContain('@anthropic-ai/claude-code');
		expect(dockerImageDefinition).toContain('@openai/codex');
		expect(engineScript).toContain('RALPH_ENGINE');
		expect(engineScript).toContain('codex');
		expect(engineScript).toContain('claude');
		expect(claudeShim).toContain('AGENTS.md');
		expect(ralphTemplate).toContain('AGENTS.md');

		expect(packageJson).toContain('"ralph:once"');
		expect(packageJson).toContain('"ralph:loop"');
		expect(packageJson).toContain('"ralph:once:codex"');
		expect(packageJson).toContain('"ralph:loop:codex"');
		expect(packageJson).toContain('"ralph:once:claude"');
		expect(packageJson).toContain('"ralph:loop:claude"');
		expect(packageJson).toContain('"ralph:docker:loop"');
		expect(packageJson).toContain('"ralph:docker:loop:inplace"');
	});
});
