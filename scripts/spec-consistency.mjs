import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const PROJECT_SPEC_PATH = 'docs/spec/PROJECT_SPEC.md';
const ARCHITECTURE_PATH = 'ARCHITECTURE.md';
const HARNESS_PATH = 'docs/spec/HARNESS.md';
const AGENT_PROTOCOL_PATH = 'docs/spec/AGENT_ITERATION_PROTOCOL.md';
const CURRENT_TRUTH_PATH = 'docs/spec/CURRENT_TRUTH.md';
const TRACEABILITY_PATH = 'tests/conformance/invariant-traceability.json';
const HIDDEN_SET_PATH = 'data/evals/hidden-set-v1.json';

function unique(values) {
	return [...new Set(values)];
}

function extractCodeBlock(content, heading) {
	const pattern =
		`${heading}[\\s\\S]*?\\n` + '```(?:bash)?\\n([\\s\\S]*?)\\n```';
	const regex = new RegExp(pattern);
	const match = content.match(regex);
	return match?.[1] ?? '';
}

function parseGateScriptsFromHarness(harnessContent) {
	const block = extractCodeBlock(harnessContent, '## Normative Gate Manifest');
	if (!block) {
		return [];
	}

	return block
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => {
			if (!line.startsWith('pnpm ')) {
				return '';
			}
			const command = line.replace(/^pnpm\s+/, '');
			if (command.startsWith('run ')) {
				return command.replace(/^run\s+/, '').trim();
			}
			return command.split(' ')[0].trim();
		})
		.filter(Boolean);
}

function parseInv5GateScripts(projectSpecContent) {
	const inv5Match = projectSpecContent.match(
		/`INV-5` Deterministic Delivery:[^\n]*passes \(([^)]+)\)/,
	);
	if (!inv5Match?.[1]) {
		return [];
	}
	return [...inv5Match[1].matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

function parseInvariantIds(projectSpecContent, architectureContent) {
	const projectInvariants = [
		...projectSpecContent.matchAll(/`((?:INV-\d+|INV-A\d+))`/g),
	].map((match) => match[1]);
	const architectureInvariants = [
		...architectureContent.matchAll(/`((?:INV-A\d+))`/g),
	].map((match) => match[1]);
	return unique([...projectInvariants, ...architectureInvariants]);
}

async function ensureFileExists(filePath, errors, label = filePath) {
	try {
		await access(filePath, constants.F_OK);
	} catch {
		errors.push(`Missing required file: ${label} (${filePath})`);
	}
}

async function main() {
	const errors = [];

	await Promise.all([
		ensureFileExists(PROJECT_SPEC_PATH, errors),
		ensureFileExists(ARCHITECTURE_PATH, errors),
		ensureFileExists(HARNESS_PATH, errors),
		ensureFileExists(AGENT_PROTOCOL_PATH, errors),
		ensureFileExists(CURRENT_TRUTH_PATH, errors),
		ensureFileExists(TRACEABILITY_PATH, errors),
		ensureFileExists(HIDDEN_SET_PATH, errors),
	]);

	if (errors.length > 0) {
		throw new Error(errors.join('\n'));
	}

	const [
		projectSpecContent,
		architectureContent,
		harnessContent,
		agentProtocolContent,
		currentTruthContent,
	] = await Promise.all([
		readFile(PROJECT_SPEC_PATH, 'utf8'),
		readFile(ARCHITECTURE_PATH, 'utf8'),
		readFile(HARNESS_PATH, 'utf8'),
		readFile(AGENT_PROTOCOL_PATH, 'utf8'),
		readFile(CURRENT_TRUTH_PATH, 'utf8'),
	]);

	const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
	const traceability = JSON.parse(await readFile(TRACEABILITY_PATH, 'utf8'));
	const hiddenSet = JSON.parse(await readFile(HIDDEN_SET_PATH, 'utf8'));

	const harnessGateScripts = parseGateScriptsFromHarness(harnessContent);
	const inv5GateScripts = parseInv5GateScripts(projectSpecContent);
	const packageScripts = packageJson.scripts ?? {};
	const invariantIds = parseInvariantIds(
		projectSpecContent,
		architectureContent,
	);

	if (harnessGateScripts.length === 0) {
		errors.push('Unable to parse normative gate manifest from HARNESS.md');
	}

	if (JSON.stringify(harnessGateScripts) !== JSON.stringify(inv5GateScripts)) {
		errors.push(
			`Gate drift: PROJECT_SPEC INV-5 list does not match HARNESS manifest.\nHARNESS: ${harnessGateScripts.join(', ')}\nINV-5: ${inv5GateScripts.join(', ')}`,
		);
	}

	for (const scriptName of harnessGateScripts) {
		if (!packageScripts[scriptName]) {
			errors.push(
				`Missing package.json script required by HARNESS manifest: ${scriptName}`,
			);
		}
	}

	if (
		agentProtocolContent.includes(
			'## Ralph Loop Contract (Spec Fragment -> Queue -> Docker)',
		)
	) {
		const ralphContractFiles = [
			'scripts/ralph-loop.mjs',
			'scripts/ralph-docker-loop.sh',
			'scripts/ralph-agent-runner.sh',
			'docker/ralph-sandbox/Dockerfile',
			'scripts/tickets-to-queue.mjs',
			'docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md',
			'CLAUDE.md',
		];
		for (const filePath of ralphContractFiles) {
			await ensureFileExists(
				filePath,
				errors,
				`ralph contract file declared in AGENT_ITERATION_PROTOCOL: ${filePath}`,
			);
		}

		const requiredRalphScripts = [
			'ralph:once',
			'ralph:loop',
			'ralph:once:codex',
			'ralph:loop:codex',
			'ralph:once:claude',
			'ralph:loop:claude',
			'ralph:docker:build',
			'ralph:docker:loop',
			'ralph:docker:loop:inplace',
		];
		for (const scriptName of requiredRalphScripts) {
			if (!packageScripts[scriptName]) {
				errors.push(
					`Missing package.json script required by Ralph loop contract: ${scriptName}`,
				);
			}
		}

		const [claudeShim, ralphTemplate] = await Promise.all([
			readFile('CLAUDE.md', 'utf8'),
			readFile('docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md', 'utf8'),
		]);
		if (!claudeShim.includes('AGENTS.md')) {
			errors.push(
				'CLAUDE.md must explicitly reference AGENTS.md as canonical root',
			);
		}
		if (!ralphTemplate.includes('AGENTS.md')) {
			errors.push(
				'RALPH_TASK_PROMPT_TEMPLATE.md must reference AGENTS.md as canonical prompt root',
			);
		}
	}

	if (agentProtocolContent.includes('## Local Markdown Ticket Contract')) {
		const ticketContractFiles = [
			'scripts/spec-fragmenter.mjs',
			'scripts/tickets-sync.mjs',
			'scripts/tickets-to-queue.mjs',
			'tickets/MATRIX.md',
			'tickets/templates/epic.md',
			'tickets/templates/user-story.md',
			'tickets/templates/bug.md',
		];
		for (const filePath of ticketContractFiles) {
			await ensureFileExists(
				filePath,
				errors,
				`ticketing contract file declared in AGENT_ITERATION_PROTOCOL: ${filePath}`,
			);
		}

		const requiredTicketScripts = [
			'tickets:fragment',
			'tickets:sync',
			'tickets:queue',
			'tickets:build',
		];
		for (const scriptName of requiredTicketScripts) {
			if (!packageScripts[scriptName]) {
				errors.push(
					`Missing package.json script required by local ticket contract: ${scriptName}`,
				);
			}
		}
	}

	if (!packageJson.packageManager?.startsWith('pnpm@')) {
		errors.push('packageManager must be pinned to pnpm@... in package.json');
	}

	if (
		!currentTruthContent.includes(
			'Package manager strategy: `pnpm` is the canonical package manager',
		)
	) {
		errors.push(
			'CURRENT_TRUTH.md is missing canonical pnpm strategy decision line',
		);
	}

	if (!traceability.invariants || typeof traceability.invariants !== 'object') {
		errors.push('Traceability artifact must contain an invariants object');
	}
	if (!traceability.tests || typeof traceability.tests !== 'object') {
		errors.push('Traceability artifact must contain a tests object');
	}

	const traceInvariants = traceability.invariants ?? {};
	const traceTests = traceability.tests ?? {};

	for (const invariantId of invariantIds) {
		const mapping = traceInvariants[invariantId];
		if (!mapping) {
			errors.push(`Traceability missing invariant mapping for ${invariantId}`);
			continue;
		}

		const testIds = mapping.testIds;
		if (!Array.isArray(testIds) || testIds.length === 0) {
			errors.push(`Invariant ${invariantId} must map to at least one testId`);
			continue;
		}

		for (const testId of testIds) {
			const testMapping = traceTests[testId];
			if (!testMapping) {
				errors.push(
					`Invariant ${invariantId} references unknown testId ${testId}`,
				);
				continue;
			}

			if (
				!Array.isArray(testMapping.invariants) ||
				!testMapping.invariants.includes(invariantId)
			) {
				errors.push(
					`Invariant ${invariantId} -> ${testId} is missing reverse link in tests.${testId}.invariants`,
				);
			}
		}
	}

	for (const [testId, mapping] of Object.entries(traceTests)) {
		const invariants = mapping.invariants;
		if (!Array.isArray(invariants) || invariants.length === 0) {
			errors.push(`Test ${testId} must reference at least one invariant`);
			continue;
		}

		for (const invariantId of invariants) {
			const invariantMapping = traceInvariants[invariantId];
			if (!invariantMapping) {
				errors.push(
					`Test ${testId} references unknown invariant ${invariantId}`,
				);
				continue;
			}

			if (
				!Array.isArray(invariantMapping.testIds) ||
				!invariantMapping.testIds.includes(testId)
			) {
				errors.push(
					`Test ${testId} -> ${invariantId} is missing reverse link in invariants.${invariantId}.testIds`,
				);
			}
		}

		if (typeof mapping.path !== 'string' || mapping.path.length === 0) {
			errors.push(`Test ${testId} must define a non-empty path`);
			continue;
		}
		await ensureFileExists(mapping.path, errors, `test file for ${testId}`);
	}

	if (!Array.isArray(hiddenSet.cases)) {
		errors.push('Hidden set manifest must contain a cases array');
	} else {
		for (const testCase of hiddenSet.cases) {
			if (!testCase.id) {
				errors.push('Hidden set case is missing id');
				continue;
			}
			if (!testCase.fixture) {
				errors.push(`Hidden set case ${testCase.id} missing fixture path`);
			} else {
				const fixturePath = path.join('data/evals', testCase.fixture);
				await ensureFileExists(
					fixturePath,
					errors,
					`hidden set fixture for ${testCase.id}`,
				);
			}

			if (
				!Array.isArray(testCase.invariants) ||
				testCase.invariants.length === 0
			) {
				errors.push(
					`Hidden set case ${testCase.id} must define at least one invariant`,
				);
			} else {
				for (const invariantId of testCase.invariants) {
					if (!traceInvariants[invariantId]) {
						errors.push(
							`Hidden set case ${testCase.id} references unknown invariant ${invariantId}`,
						);
					}
				}
			}

			if (!Array.isArray(testCase.testIds) || testCase.testIds.length === 0) {
				errors.push(
					`Hidden set case ${testCase.id} must define at least one testId`,
				);
			} else {
				for (const testId of testCase.testIds) {
					if (!traceTests[testId]) {
						errors.push(
							`Hidden set case ${testCase.id} references unknown testId ${testId}`,
						);
					}
				}
			}
		}
	}

	if (errors.length > 0) {
		const details = errors
			.map((error, index) => `${index + 1}. ${error}`)
			.join('\n');
		throw new Error(`spec-consistency failed:\n${details}`);
	}

	const summary = [
		`invariants=${invariantIds.length}`,
		`trace-tests=${Object.keys(traceTests).length}`,
		`hidden-cases=${hiddenSet.cases.length}`,
		`gates=${harnessGateScripts.length}`,
	].join(' ');
	console.log(`spec-consistency passed (${summary})`);
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
