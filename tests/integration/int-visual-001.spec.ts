import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

type TemplateContract = {
	route: '/' | '/projects/[slug]' | '/writing' | '/writing/[slug]';
	routeFile: string;
	componentFile: string;
	cssFile: string;
	componentSymbol: string;
	testId: string;
	rootSelector: string;
	requiredRules: Array<{
		selector: string;
		property: string;
		value: string;
	}>;
};

const REQUIRED_BASELINE_VARS = [
	'--bg',
	'--green',
	'--cyan',
	'--white',
	'--border',
] as const;

const CRITICAL_TEMPLATE_CONTRACTS: TemplateContract[] = [
	{
		route: '/',
		routeFile: 'src/app/page.tsx',
		componentFile: 'src/components/home/terminal-noir-home.tsx',
		cssFile: 'src/components/home/terminal-noir-home.module.css',
		componentSymbol: 'TerminalNoirHome',
		testId: 'terminal-noir-home',
		rootSelector: '.terminalNoir',
		requiredRules: [
			{
				selector: '.terminalNoir',
				property: 'background-size',
				value: 'auto, 40px 40px, 40px 40px',
			},
			{
				selector: '.nav',
				property: 'position',
				value: 'fixed',
			},
			{
				selector: '.heroName',
				property: 'font-size',
				value: 'clamp(52px, 8vw, 96px)',
			},
			{
				selector: '.btnPrimary',
				property: 'clip-path',
				value: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
			},
		],
	},
	{
		route: '/projects/[slug]',
		routeFile: 'src/app/projects/[slug]/page.tsx',
		componentFile: 'src/components/projects/terminal-noir-project.tsx',
		cssFile: 'src/components/projects/terminal-noir-project.module.css',
		componentSymbol: 'TerminalNoirProject',
		testId: 'terminal-noir-project',
		rootSelector: '.projectPage',
		requiredRules: [
			{
				selector: '.projectPage',
				property: 'background-size',
				value: 'auto, 40px 40px, 40px 40px',
			},
			{
				selector: '.hero',
				property: 'display',
				value: 'grid',
			},
			{
				selector: '.hero',
				property: 'grid-template-columns',
				value: 'minmax(0, 1fr) 280px',
			},
			{
				selector: '.title',
				property: 'font-size',
				value: 'clamp(34px, 6vw, 64px)',
			},
		],
	},
	{
		route: '/writing',
		routeFile: 'src/app/writing/page.tsx',
		componentFile: 'src/components/writing/terminal-noir-writing-index.tsx',
		cssFile: 'src/components/writing/terminal-noir-writing-index.module.css',
		componentSymbol: 'TerminalNoirWritingIndex',
		testId: 'terminal-noir-writing-index',
		rootSelector: '.writingIndex',
		requiredRules: [
			{
				selector: '.writingIndex',
				property: 'background-size',
				value: 'auto, 40px 40px, 40px 40px',
			},
			{
				selector: '.layout',
				property: 'display',
				value: 'grid',
			},
			{
				selector: '.layout',
				property: 'grid-template-columns',
				value: '280px minmax(0, 1fr)',
			},
			{
				selector: '.card',
				property: 'display',
				value: 'grid',
			},
		],
	},
	{
		route: '/writing/[slug]',
		routeFile: 'src/app/writing/[slug]/page.tsx',
		componentFile: 'src/components/writing/terminal-noir-writing.tsx',
		cssFile: 'src/components/writing/terminal-noir-writing.module.css',
		componentSymbol: 'TerminalNoirWriting',
		testId: 'terminal-noir-writing',
		rootSelector: '.writingPage',
		requiredRules: [
			{
				selector: '.writingPage',
				property: 'background-size',
				value: 'auto, 40px 40px, 40px 40px',
			},
			{
				selector: '.hero',
				property: 'display',
				value: 'grid',
			},
			{
				selector: '.hero',
				property: 'grid-template-columns',
				value: 'minmax(0, 1fr) 280px',
			},
			{
				selector: '.title',
				property: 'font-size',
				value: 'clamp(34px, 6vw, 64px)',
			},
			{
				selector: '.body p',
				property: 'color',
				value: '#c8c8c8',
			},
			{
				selector: '.body p',
				property: 'line-height',
				value: '2',
			},
		],
	},
];

function normalizeCssValue(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDeclarations(block: string): Record<string, string> {
	const declarations: Record<string, string> = {};
	const declarationMatches = block.matchAll(/([-\w]+)\s*:\s*([^;]+);/g);

	for (const match of declarationMatches) {
		const property = match[1]?.trim();
		const rawValue = match[2]?.trim();
		if (!property || !rawValue) {
			continue;
		}
		declarations[property] = normalizeCssValue(rawValue);
	}

	return declarations;
}

function extractRuleDeclarations(
	source: string,
	selector: string,
): Record<string, string> {
	const ruleRegex = new RegExp(
		`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`,
	);
	const match = source.match(ruleRegex);
	if (!match?.[1]) {
		throw new Error(`Missing CSS rule for selector: ${selector}`);
	}
	return parseDeclarations(match[1]);
}

function extractDesignRootTokens(designSource: string): Record<string, string> {
	const rootMatch = designSource.match(/:root\s*\{([\s\S]*?)\}/);
	if (!rootMatch?.[1]) {
		throw new Error('Unable to locate :root token block in design baseline');
	}

	const declarations = parseDeclarations(rootMatch[1]);
	const rootTokens: Record<string, string> = {};
	for (const [property, value] of Object.entries(declarations)) {
		if (property.startsWith('--')) {
			rootTokens[property] = value;
		}
	}
	return rootTokens;
}

describe('EVAL-007', () => {
	it('checks critical templates against terminal-noir baseline snapshot/assertion contract', async () => {
		const designSource = await readFile(
			'designs/design-1-terminal-noir.html',
			'utf8',
		);
		const designRootTokens = extractDesignRootTokens(designSource);

		expect(designRootTokens['--bg']).toBe('#0a0a0a');
		expect(designRootTokens['--green']).toBe('#00ff41');
		expect(designRootTokens['--cyan']).toBe('#00d4ff');

		for (const contract of CRITICAL_TEMPLATE_CONTRACTS) {
			const [routeSource, componentSource, cssSource] = await Promise.all([
				readFile(contract.routeFile, 'utf8'),
				readFile(contract.componentFile, 'utf8'),
				readFile(contract.cssFile, 'utf8'),
			]);

			expect(routeSource).toContain(contract.componentSymbol);
			expect(routeSource).not.toContain('StoryblokStory');
			expect(componentSource).toContain(`data-testid="${contract.testId}"`);

			const rootDeclarations = extractRuleDeclarations(
				cssSource,
				contract.rootSelector,
			);

			for (const variableName of REQUIRED_BASELINE_VARS) {
				expect(rootDeclarations[variableName]).toBe(
					designRootTokens[variableName],
				);
			}

			expect(rootDeclarations['font-family']).toContain('"JetBrains Mono"');
			expect(rootDeclarations['font-family']).toContain('"Share Tech Mono"');
			expect(
				rootDeclarations['background'] ?? rootDeclarations['background-color'],
			).toBe('var(--bg)');

			const ruleSnapshot: Record<string, Record<string, string>> = {};
			for (const rule of contract.requiredRules) {
				const declarations = extractRuleDeclarations(cssSource, rule.selector);
				expect(declarations[rule.property]).toBe(rule.value);
				ruleSnapshot[rule.selector] = declarations;
			}

			expect({
				route: contract.route,
				testId: contract.testId,
				root: {
					background:
						rootDeclarations.background ?? rootDeclarations['background-color'],
					fontFamily: rootDeclarations['font-family'],
					fontSize: rootDeclarations['font-size'],
					lineHeight: rootDeclarations['line-height'],
					variables: Object.fromEntries(
						REQUIRED_BASELINE_VARS.map((variableName) => [
							variableName,
							rootDeclarations[variableName],
						]),
					),
				},
				rules: ruleSnapshot,
			}).toMatchSnapshot();
		}
	});
});
