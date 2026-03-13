import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Dependency boundary rules from ARCHITECTURE.md:
 * - src/lib/* MUST NOT import from app/*
 * - src/lib/validation/* MUST NOT import from UI layers (app/*, src/features/*, src/components/*)
 * - src/components/* MUST NOT import from app/*
 * - scripts/* MUST NOT be imported by runtime code
 *
 * NOTE: In flat config, rules from multiple matching configs do NOT merge arrays—
 * the last matching config's rule value wins. Therefore, we must combine all
 * applicable patterns into single rule definitions per file scope.
 */

// Base patterns that apply to all src/* files
const scriptsPatterns = [
	{
		group: ['**/scripts/*', '../scripts/*', '../../scripts/*'],
		message: 'scripts/* MUST NOT be imported by runtime code (ARCHITECTURE.md)',
	},
];

// Patterns for src/lib/* files
const libAppPatterns = [
	{
		group: ['@/app/*', '../app/*', '../../app/*', '../../../app/*'],
		message: 'src/lib/* MUST NOT import from app/* (ARCHITECTURE.md)',
	},
];

// Additional patterns for src/lib/validation/* files (UI layers)
const validationUiPatterns = [
	{
		group: [
			'@/features/*',
			'../features/*',
			'../../features/*',
			'../../../features/*',
		],
		message:
			'src/lib/validation/* MUST NOT import from src/features/* (ARCHITECTURE.md)',
	},
	{
		group: [
			'@/components/*',
			'../components/*',
			'../../components/*',
			'../../../components/*',
		],
		message:
			'src/lib/validation/* MUST NOT import from src/components/* (ARCHITECTURE.md)',
	},
];

// Patterns for src/components/* files
const componentsAppPatterns = [
	{
		group: ['@/app/*', '../app/*', '../../app/*', '../../../app/*'],
		message: 'src/components/* MUST NOT import from app/* (ARCHITECTURE.md)',
	},
];

const boundaryRules = [
	// src/lib/validation/* has the most restrictive rules (app + features + components + scripts)
	{
		files: ['src/lib/validation/**/*.ts', 'src/lib/validation/**/*.tsx'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						...libAppPatterns,
						...validationUiPatterns,
						...scriptsPatterns,
					],
				},
			],
		},
	},
	// src/lib/* (except validation) cannot import from app/* or scripts/*
	{
		files: ['src/lib/**/*.ts', 'src/lib/**/*.tsx'],
		ignores: ['src/lib/validation/**/*'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [...libAppPatterns, ...scriptsPatterns],
				},
			],
		},
	},
	// src/components/* cannot import from app/* or scripts/*
	{
		files: ['src/components/**/*.ts', 'src/components/**/*.tsx'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [...componentsAppPatterns, ...scriptsPatterns],
				},
			],
		},
	},
	// src/features/* and src/app/* cannot import from scripts/*
	{
		files: [
			'src/features/**/*.ts',
			'src/features/**/*.tsx',
			'src/app/**/*.ts',
			'src/app/**/*.tsx',
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [...scriptsPatterns],
				},
			],
		},
	},
];

const generatedTypeRules = {
	files: ['data/storyblok/types/**/*.d.ts', 'src/types/generated/**/*.d.ts'],
	rules: {
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-empty-object-type': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
	},
};

const config = [
	...nextVitals,
	...nextTypescript,
	...boundaryRules,
	generatedTypeRules,
];

export default config;
