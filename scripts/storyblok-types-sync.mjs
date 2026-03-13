import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

const DEFAULT_SPACE_ID = '290927119725014';
const DATA_ROOT = 'data/storyblok';
const DESTINATION_DIR = 'src/types/generated';
const STORYBLOK_CLI_FALLBACK_VERSION = '4.15.2';
const SCHEMA_SOURCE_PREFIX = '// schema-source: ';
const SCHEMA_HASH_PREFIX = '// schema-sha256: ';
const PNPM_DLX_STORE_DIR =
	process.env.PNPM_DLX_STORE_DIR ?? `${tmpdir()}/pnpm-dlx-store`;

function runCommand(command, args, env = process.env) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: process.cwd(),
			stdio: 'inherit',
			env,
		});

		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${command} exited with code ${code ?? 'unknown'}`));
		});
	});
}

async function runStoryblokTypesGenerate(spaceId) {
	const generateArgs = [
		'types',
		'generate',
		'--space',
		spaceId,
		'--path',
		DATA_ROOT,
		'--filename',
		'storyblok-schema',
		'--suffix',
		'schema-v1',
		'--strict',
	];

	try {
		await runCommand('storyblok', generateArgs);
	} catch (error) {
		const noLocalCli =
			error instanceof Error &&
			error.message.includes('spawn storyblok ENOENT');
		if (!noLocalCli) {
			throw error;
		}

		await runCommand(
			'pnpm',
			['dlx', `storyblok@${STORYBLOK_CLI_FALLBACK_VERSION}`, ...generateArgs],
			{
				...process.env,
				npm_config_store_dir: PNPM_DLX_STORE_DIR,
			},
		);
	}
}

function withSchemaMetadata(source, schemaPath, schemaHash) {
	const lines = source
		.split('\n')
		.filter(
			(line) =>
				!line.startsWith(SCHEMA_SOURCE_PREFIX) &&
				!line.startsWith(SCHEMA_HASH_PREFIX),
		);
	const metadataLines = [
		`${SCHEMA_SOURCE_PREFIX}${schemaPath}`,
		`${SCHEMA_HASH_PREFIX}${schemaHash}`,
	];
	const insertIndex =
		lines[0]?.startsWith('// This file was generated') &&
		lines[1]?.startsWith('// DO NOT MODIFY THIS FILE BY HAND.')
			? 2
			: 0;

	return [
		...lines.slice(0, insertIndex),
		...metadataLines,
		...lines.slice(insertIndex),
	].join('\n');
}

async function getSchemaFingerprint(spaceId) {
	const schemaPath = `${DATA_ROOT}/components/${spaceId}/components.schema-v1.json`;
	const schemaSource = await readFile(schemaPath, 'utf8');
	const schemaHash = createHash('sha256').update(schemaSource).digest('hex');
	return {
		schemaPath,
		schemaHash,
	};
}

async function syncGeneratedTypes(spaceId) {
	const generatedSchemaPath = `${DATA_ROOT}/types/${spaceId}/storyblok-schema.d.ts`;
	const generatedPrimitivesPath = `${DATA_ROOT}/types/storyblok.d.ts`;
	const destinationSchemaPath = `${DESTINATION_DIR}/storyblok-schema.d.ts`;
	const destinationPrimitivesPath = `${DESTINATION_DIR}/storyblok.d.ts`;
	const schemaFingerprint = await getSchemaFingerprint(spaceId);

	const rawSchemaSource = await readFile(generatedSchemaPath, 'utf8');
	const schemaSource = withSchemaMetadata(
		rawSchemaSource.replace(
			"from '../storyblok.d.ts';",
			"from './storyblok.d.ts';",
		),
		schemaFingerprint.schemaPath,
		schemaFingerprint.schemaHash,
	);
	const primitiveSource = withSchemaMetadata(
		await readFile(generatedPrimitivesPath, 'utf8'),
		schemaFingerprint.schemaPath,
		schemaFingerprint.schemaHash,
	);

	await mkdir(DESTINATION_DIR, { recursive: true });
	await writeFile(destinationSchemaPath, schemaSource, 'utf8');
	await writeFile(destinationPrimitivesPath, primitiveSource, 'utf8');

	await runCommand('pnpm', [
		'exec',
		'biome',
		'format',
		'--write',
		destinationSchemaPath,
		destinationPrimitivesPath,
	]);
}

async function main() {
	const spaceId = process.env.STORYBLOK_SPACE_ID ?? DEFAULT_SPACE_ID;
	await runStoryblokTypesGenerate(spaceId);
	await syncGeneratedTypes(spaceId);
}

await main();
