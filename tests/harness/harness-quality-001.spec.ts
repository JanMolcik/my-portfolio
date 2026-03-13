import { readFile, access } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('HARNESS-QUALITY-001', () => {
	it('tsconfig.json has strict mode enabled', async () => {
		const raw = await readFile('tsconfig.json', 'utf8');
		const tsconfig = JSON.parse(raw);
		expect(tsconfig.compilerOptions.strict).toBe(true);
	});

	it('eslint config exists at project root', async () => {
		await expect(access('eslint.config.mjs')).resolves.toBeUndefined();
	});

	it('package.json defines lint, typecheck, and cq scripts', async () => {
		const raw = await readFile('package.json', 'utf8');
		const pkg = JSON.parse(raw);
		expect(pkg.scripts.lint).toBeDefined();
		expect(pkg.scripts.typecheck).toBeDefined();
		expect(pkg.scripts.cq).toBeDefined();
		expect(pkg.scripts['cq:check']).toBeDefined();
	});

	it('biome formatter is enabled', async () => {
		const raw = await readFile('biome.jsonc', 'utf8');
		expect(raw).toMatch(/"formatter"[\s\S]*?"enabled":\s*true/);
	});
});
