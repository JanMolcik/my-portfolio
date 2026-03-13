import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ARCH-BOUNDARIES-001: Forbidden dependency enforcement from ARCHITECTURE.md
 *
 * Rules:
 * - src/lib/* MUST NOT import from app/*
 * - src/lib/validation/* MUST NOT import from UI layers (app/*, src/features/*, src/components/*)
 * - src/components/* MUST NOT import from app/*
 * - scripts/* MUST NOT be imported by runtime code
 */

interface Violation {
	file: string;
	importPath: string;
	rule: string;
}

const importPattern = /(?:import|from)\s+['"]([^'"]+)['"]/g;

async function collectFiles(dir: string, pattern: RegExp): Promise<string[]> {
	const files: string[] = [];

	async function scan(currentDir: string): Promise<void> {
		const entries = await readdir(currentDir, { withFileTypes: true }).catch(
			() => [],
		);
		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);
			if (
				entry.isDirectory() &&
				!entry.name.startsWith('.') &&
				entry.name !== 'node_modules'
			) {
				await scan(fullPath);
			} else if (entry.isFile() && pattern.test(entry.name)) {
				files.push(fullPath);
			}
		}
	}

	await scan(dir);
	return files;
}

function extractImports(content: string): string[] {
	const imports: string[] = [];
	let match: RegExpExecArray | null;
	while ((match = importPattern.exec(content)) !== null) {
		imports.push(match[1]);
	}
	return imports;
}

function isAppImport(importPath: string): boolean {
	return (
		importPath.startsWith('@/app/') ||
		importPath.includes('/app/') ||
		importPath.match(/^\.\.?\/.*app\//) !== null
	);
}

function isFeaturesImport(importPath: string): boolean {
	return (
		importPath.startsWith('@/features/') ||
		importPath.includes('/features/') ||
		importPath.match(/^\.\.?\/.*features\//) !== null
	);
}

function isComponentsImport(importPath: string): boolean {
	return (
		importPath.startsWith('@/components/') ||
		importPath.includes('/components/') ||
		importPath.match(/^\.\.?\/.*components\//) !== null
	);
}

function isScriptsImport(importPath: string): boolean {
	return (
		importPath.includes('/scripts/') ||
		importPath.match(/^\.\.?\/.*scripts\//) !== null
	);
}

describe('ARCH-BOUNDARIES-001', () => {
	it('src/lib/* must not import from app/*', async () => {
		const files = await collectFiles('src/lib', /\.(ts|tsx)$/);
		const violations: Violation[] = [];

		for (const file of files) {
			const content = await readFile(file, 'utf8');
			const imports = extractImports(content);

			for (const importPath of imports) {
				if (isAppImport(importPath)) {
					violations.push({
						file,
						importPath,
						rule: 'src/lib/* MUST NOT import from app/*',
					});
				}
			}
		}

		expect(
			violations,
			`Forbidden imports found:\n${formatViolations(violations)}`,
		).toHaveLength(0);
	});

	it('src/lib/validation/* must not import from UI layers', async () => {
		const files = await collectFiles('src/lib/validation', /\.(ts|tsx)$/);
		const violations: Violation[] = [];

		for (const file of files) {
			const content = await readFile(file, 'utf8');
			const imports = extractImports(content);

			for (const importPath of imports) {
				if (isAppImport(importPath)) {
					violations.push({
						file,
						importPath,
						rule: 'src/lib/validation/* MUST NOT import from app/*',
					});
				}
				if (isFeaturesImport(importPath)) {
					violations.push({
						file,
						importPath,
						rule: 'src/lib/validation/* MUST NOT import from src/features/*',
					});
				}
				if (isComponentsImport(importPath)) {
					violations.push({
						file,
						importPath,
						rule: 'src/lib/validation/* MUST NOT import from src/components/*',
					});
				}
			}
		}

		expect(
			violations,
			`Forbidden imports found:\n${formatViolations(violations)}`,
		).toHaveLength(0);
	});

	it('src/components/* must not import from app/*', async () => {
		const files = await collectFiles('src/components', /\.(ts|tsx)$/);
		const violations: Violation[] = [];

		for (const file of files) {
			const content = await readFile(file, 'utf8');
			const imports = extractImports(content);

			for (const importPath of imports) {
				if (isAppImport(importPath)) {
					violations.push({
						file,
						importPath,
						rule: 'src/components/* MUST NOT import from app/*',
					});
				}
			}
		}

		expect(
			violations,
			`Forbidden imports found:\n${formatViolations(violations)}`,
		).toHaveLength(0);
	});

	it('runtime code (src/*) must not import from scripts/*', async () => {
		const files = await collectFiles('src', /\.(ts|tsx)$/);
		const violations: Violation[] = [];

		for (const file of files) {
			const content = await readFile(file, 'utf8');
			const imports = extractImports(content);

			for (const importPath of imports) {
				if (isScriptsImport(importPath)) {
					violations.push({
						file,
						importPath,
						rule: 'scripts/* MUST NOT be imported by runtime code',
					});
				}
			}
		}

		expect(
			violations,
			`Forbidden imports found:\n${formatViolations(violations)}`,
		).toHaveLength(0);
	});
});

function formatViolations(violations: Violation[]): string {
	if (violations.length === 0) return '';
	return violations
		.map((v) => `  ${v.file}: ${v.importPath} (${v.rule})`)
		.join('\n');
}
