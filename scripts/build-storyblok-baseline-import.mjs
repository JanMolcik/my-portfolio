import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { buildStoryblokBaselineImportBundle } from '../src/lib/storyblok/contentful-import.ts';

const DEFAULT_SPACE_ID = '290927119725014';
const DEFAULT_EXPORT_DIR = 'data/contentful-export';
const DEFAULT_OUTPUT_ROOT = 'data/storyblok/imports';

function parseArgs(argv) {
	const args = { spaceId: process.env.STORYBLOK_SPACE_ID || DEFAULT_SPACE_ID };

	for (let i = 0; i < argv.length; i += 1) {
		const token = argv[i];
		if ((token === '--space' || token === '-s') && argv[i + 1]) {
			args.spaceId = argv[i + 1];
			i += 1;
		}
	}

	return args;
}

async function readJson(filePath) {
	const raw = await readFile(filePath, 'utf8');
	return JSON.parse(raw);
}

async function main() {
	const { spaceId } = parseArgs(process.argv.slice(2));
	const entriesPath = path.join(DEFAULT_EXPORT_DIR, 'entries.json');
	const assetsPath = path.join(DEFAULT_EXPORT_DIR, 'assets.json');
	const metaPath = path.join(DEFAULT_EXPORT_DIR, 'meta.json');

	const [entriesExport, assetsExport, metaExport] = await Promise.all([
		readJson(entriesPath),
		readJson(assetsPath),
		readJson(metaPath),
	]);

	const bundle = buildStoryblokBaselineImportBundle({
		entries: entriesExport.items ?? [],
		assets: assetsExport.items ?? [],
		exportedAt:
			typeof metaExport.exportedAt === 'string'
				? metaExport.exportedAt
				: undefined,
	});

	const outputDir = path.join(DEFAULT_OUTPUT_ROOT, spaceId);
	const outputPath = path.join(outputDir, 'baseline-content-import-v1.json');
	await mkdir(outputDir, { recursive: true });
	await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`);

	console.log(
		[
			`wrote ${outputPath}`,
			`home=${bundle.summary.home_count}`,
			`projects=${bundle.summary.project_count}`,
			`experience=${bundle.summary.experience_count}`,
			`social_links=${bundle.summary.social_link_count}`,
			`missing_assets=${bundle.diagnostics.missing_asset_ids.length}`,
		].join(' | '),
	);
}

main().catch((error) => {
	console.error('Failed to build baseline Storyblok import artifact.');
	console.error(error);
	process.exitCode = 1;
});
