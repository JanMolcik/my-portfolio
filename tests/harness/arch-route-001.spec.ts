import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type StaticRoutePolicy = {
	filePath: string;
	revalidate: number;
	requiresDynamicParams: boolean;
	requiresStaticParamsGenerator: boolean;
};

const staticRoutePolicyMatrix: StaticRoutePolicy[] = [
	{
		filePath: 'src/app/page.tsx',
		revalidate: 3600,
		requiresDynamicParams: false,
		requiresStaticParamsGenerator: false,
	},
	{
		filePath: 'src/app/projects/[slug]/page.tsx',
		revalidate: 3600,
		requiresDynamicParams: true,
		requiresStaticParamsGenerator: true,
	},
	{
		filePath: 'src/app/writing/page.tsx',
		revalidate: 3600,
		requiresDynamicParams: false,
		requiresStaticParamsGenerator: false,
	},
	{
		filePath: 'src/app/writing/page/[page]/page.tsx',
		revalidate: 3600,
		requiresDynamicParams: true,
		requiresStaticParamsGenerator: true,
	},
	{
		filePath: 'src/app/writing/[slug]/page.tsx',
		revalidate: 3600,
		requiresDynamicParams: true,
		requiresStaticParamsGenerator: true,
	},
	{
		filePath: 'src/app/sitemap.ts',
		revalidate: 86400,
		requiresDynamicParams: false,
		requiresStaticParamsGenerator: false,
	},
	{
		filePath: 'src/app/robots.ts',
		revalidate: 86400,
		requiresDynamicParams: false,
		requiresStaticParamsGenerator: false,
	},
];

const allowedDynamicExceptionRouteHandlers = new Set([
	'src/app/api/preview/route.ts',
	'src/app/api/preview/[...path]/route.ts',
	'src/app/api/exit-preview/route.ts',
	'src/app/api/exit-preview/[...path]/route.ts',
	'src/app/api/revalidate/storyblok/route.ts',
	'src/app/api/contact/route.ts',
]);

const dynamicExceptionSignals = [
	"export const dynamic = 'force-dynamic';",
	'export const revalidate = 0;',
	"export const fetchCache = 'force-no-store';",
];

async function listRouteEntryFiles(directoryPath: string): Promise<string[]> {
	const entries = await readdir(directoryPath, { withFileTypes: true });
	const discoveredFiles: string[] = [];

	for (const entry of entries) {
		const entryPath = path.join(directoryPath, entry.name);
		if (entry.isDirectory()) {
			discoveredFiles.push(...(await listRouteEntryFiles(entryPath)));
			continue;
		}

		if (!entry.isFile()) {
			continue;
		}

		const isRouteEntryFile = /\.(ts|tsx)$/.test(entry.name);
		if (isRouteEntryFile) {
			discoveredFiles.push(entryPath.replaceAll('\\', '/'));
		}
	}

	return discoveredFiles;
}

describe('ARCH-ROUTE-001', () => {
	it('enforces static route matrix declarations for implemented public routes', async () => {
		for (const routePolicy of staticRoutePolicyMatrix) {
			const source = await readFile(routePolicy.filePath, 'utf8');

			expect(source).toContain("export const dynamic = 'force-static';");
			expect(source).toContain(
				`export const revalidate = ${routePolicy.revalidate};`,
			);

			if (routePolicy.requiresDynamicParams) {
				expect(source).toContain('export const dynamicParams = true;');
			} else {
				expect(source).not.toContain('export const dynamicParams = true;');
			}

			if (routePolicy.requiresStaticParamsGenerator) {
				expect(source).toContain('export async function generateStaticParams');
			} else {
				expect(source).not.toContain(
					'export async function generateStaticParams',
				);
			}
		}
	});

	it('allows dynamic rendering exceptions only on whitelisted operational route handlers', async () => {
		const routeEntryFiles = await listRouteEntryFiles('src/app');
		for (const routeFile of routeEntryFiles) {
			const source = await readFile(routeFile, 'utf8');
			const hasDynamicExceptionSignal = dynamicExceptionSignals.some((signal) =>
				source.includes(signal),
			);
			if (!hasDynamicExceptionSignal) {
				continue;
			}

			expect(
				allowedDynamicExceptionRouteHandlers.has(routeFile),
				`${routeFile} declared dynamic exception policy but is not in the allowed route handler whitelist`,
			).toBe(true);
		}
	});
});
