import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('HARNESS-SUPPLY-CHAIN-001', () => {
	it('lockfile is committed to source control', () => {
		expect(existsSync('pnpm-lock.yaml')).toBe(true);
	});

	it('CI workflow enforces frozen lockfile during install', () => {
		const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
		expect(workflow).toContain('--frozen-lockfile');
	});

	it('reports no critical or high severity vulnerabilities in the dependency tree', {
		timeout: 30_000,
	}, () => {
		let auditJson: string;
		try {
			// --prod: dev dependency advisories are acceptable (see R6 in SECURITY_AUDIT_2026-04-14.md)
			auditJson = execSync('pnpm audit --prod --json', { encoding: 'utf8' });
		} catch (err: unknown) {
			// pnpm audit exits non-zero when vulnerabilities are found, and stdout
			// still contains JSON in that case. Empty/missing stdout indicates the
			// audit did not run (registry/network/auth error) — fail closed.
			const e = err as { stdout?: string };
			const stdout = e.stdout?.trim() ?? '';
			if (stdout.length === 0) {
				throw new Error(
					'pnpm audit did not produce JSON output — audit gate cannot verify supply chain. Investigate network/registry/auth failures before treating this as a clean audit.',
				);
			}
			auditJson = stdout;
		}

		let audit: {
			metadata?: { vulnerabilities?: { critical?: number; high?: number } };
		};
		try {
			audit = JSON.parse(auditJson);
		} catch (parseErr) {
			throw new Error(
				`pnpm audit returned non-JSON output — audit gate cannot verify supply chain. Original parse error: ${(parseErr as Error).message}`,
			);
		}
		const vulns = audit.metadata?.vulnerabilities ?? {};

		expect(vulns.critical ?? 0, 'critical severity vulnerabilities').toBe(0);
		expect(vulns.high ?? 0, 'high severity vulnerabilities').toBe(0);
	});
});
