#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
	const args = {
		envFile: null,
		outDir: 'data/contentful-export',
		environment: 'master',
		preview: false,
	};

	for (let i = 2; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--env-file') {
			args.envFile = argv[i + 1];
			i += 1;
		} else if (arg === '--out-dir') {
			args.outDir = argv[i + 1];
			i += 1;
		} else if (arg === '--environment') {
			args.environment = argv[i + 1];
			i += 1;
		} else if (arg === '--preview') {
			args.preview = true;
		}
	}

	return args;
}

function parseEnv(content) {
	const map = new Map();
	for (const rawLine of content.split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const idx = line.indexOf('=');
		if (idx === -1) continue;
		const key = line.slice(0, idx).trim();
		const value = line.slice(idx + 1).trim();
		map.set(key, value);
	}
	return map;
}

async function resolveConfig(args) {
	let envMap = new Map();
	if (args.envFile) {
		const envContent = await readFile(args.envFile, 'utf8');
		envMap = parseEnv(envContent);
	}

	const spaceId = process.env.SPACE_ID || envMap.get('SPACE_ID');
	const accessToken = process.env.ACCESS_TOKEN || envMap.get('ACCESS_TOKEN');
	if (!spaceId || !accessToken) {
		throw new Error(
			'Missing SPACE_ID or ACCESS_TOKEN. Pass --env-file or set env vars.',
		);
	}

	return { spaceId, accessToken };
}

async function fetchAll({
	baseUrl,
	spaceId,
	environment,
	accessToken,
	resource,
}) {
	const items = [];
	const limit = 1000;
	let skip = 0;
	let total = 0;

	while (true) {
		const url = `${baseUrl}/spaces/${spaceId}/environments/${environment}/${resource}?limit=${limit}&skip=${skip}`;
		const res = await fetch(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Failed ${resource} (${res.status}): ${text}`);
		}

		const data = await res.json();
		total = data.total ?? data.items?.length ?? 0;
		if (Array.isArray(data.items)) {
			items.push(...data.items);
		}

		if (skip + limit >= total) break;
		skip += limit;
	}

	return { total, items };
}

async function main() {
	const args = parseArgs(process.argv);
	const { spaceId, accessToken } = await resolveConfig(args);
	const baseUrl = args.preview
		? 'https://preview.contentful.com'
		: 'https://cdn.contentful.com';

	const outDirAbs = path.resolve(process.cwd(), args.outDir);
	await mkdir(outDirAbs, { recursive: true });

	const resources = ['content_types', 'locales', 'entries', 'assets'];
	const output = {};

	for (const resource of resources) {
		console.log(`Exporting ${resource}...`);
		output[resource] = await fetchAll({
			baseUrl,
			spaceId,
			environment: args.environment,
			accessToken,
			resource,
		});
		const filePath = path.join(outDirAbs, `${resource}.json`);
		await writeFile(
			filePath,
			JSON.stringify(output[resource], null, 2),
			'utf8',
		);
	}

	const meta = {
		exportedAt: new Date().toISOString(),
		spaceId,
		environment: args.environment,
		source: args.preview ? 'preview' : 'delivery',
		counts: {
			content_types: output.content_types.total,
			locales: output.locales.total,
			entries: output.entries.total,
			assets: output.assets.total,
		},
	};

	await writeFile(
		path.join(outDirAbs, 'meta.json'),
		JSON.stringify(meta, null, 2),
		'utf8',
	);
	await writeFile(
		path.join(outDirAbs, 'full-export.json'),
		JSON.stringify({ meta, data: output }, null, 2),
		'utf8',
	);

	console.log('Done.');
	console.log(JSON.stringify(meta, null, 2));
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
