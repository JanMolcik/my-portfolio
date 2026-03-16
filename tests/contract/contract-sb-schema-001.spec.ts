import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const SPACE_ID = '290927119725014';
const SCHEMA_PATH = `data/storyblok/components/${SPACE_ID}/components.schema-v1.json`;
const MIGRATIONS_DIR = `data/storyblok/migrations/${SPACE_ID}`;
const WORKFLOW_PATH = 'docs/storyblok/schema-v1-workflow.md';
const PUBLISH_CHECKLIST_PATH = 'docs/storyblok/publish-checklist-v1.md';
const GENERATED_TYPES_PATH = 'src/types/generated/storyblok-schema.d.ts';
const GENERATED_PRIMITIVES_PATH = 'src/types/generated/storyblok.d.ts';
const PACKAGE_JSON_PATH = 'package.json';
const STORYBLOK_TYPES_SYNC_SCRIPT_PATH = 'scripts/storyblok-types-sync.mjs';
const SCHEMA_SOURCE_PREFIX = '// schema-source: ';
const SCHEMA_HASH_PREFIX = '// schema-sha256: ';

type StoryblokField = {
	type?: string;
	field_type?: string;
	required?: boolean;
	unique?: boolean;
	restrict_components?: boolean;
	component_whitelist?: string[];
	maximum?: number;
	options?: Array<{ name?: string; value?: string }>;
};

type StoryblokComponent = {
	name: string;
	is_root?: boolean;
	schema?: Record<string, StoryblokField>;
};

type PackageJson = {
	scripts?: Record<string, string>;
};

const REQUIRED_COMPONENT_FIELDS: Record<
	string,
	Record<string, { type: string; required: boolean }>
> = {
	page_home: {
		headline: { type: 'text', required: true },
		role: { type: 'text', required: true },
		hero_intro: { type: 'richtext', required: true },
		about_intro: { type: 'richtext', required: true },
		profile_image: { type: 'asset', required: false },
		tech_stack: { type: 'custom', required: false },
		availability_note: { type: 'textarea', required: true },
		availability_status: { type: 'text', required: true },
		availability_timezone: { type: 'text', required: true },
		availability_response_time: { type: 'text', required: true },
		social_links: { type: 'bloks', required: true },
		featured_projects: { type: 'options', required: true },
		experience: { type: 'options', required: true },
		seo: { type: 'bloks', required: true },
	},
	page_project: {
		title: { type: 'text', required: true },
		slug: { type: 'text', required: true },
		summary: { type: 'textarea', required: true },
		content: { type: 'richtext', required: false },
		published_date: { type: 'datetime', required: true },
		project_url: { type: 'text', required: false },
		repository_url: { type: 'text', required: false },
		type: { type: 'text', required: true },
		portfolio_priority: { type: 'number', required: false },
		stack: { type: 'options', required: false },
		logo: { type: 'asset', required: false },
		seo: { type: 'bloks', required: true },
	},
	page_writing: {
		title: { type: 'text', required: true },
		slug: { type: 'text', required: true },
		excerpt: { type: 'textarea', required: true },
		content: { type: 'richtext', required: true },
		published_date: { type: 'datetime', required: true },
		cover_image: { type: 'asset', required: false },
		tags: { type: 'options', required: false },
		seo: { type: 'bloks', required: true },
	},
	item_experience: {
		title: { type: 'text', required: true },
		company_name: { type: 'text', required: true },
		description: { type: 'richtext', required: true },
		start_date: { type: 'datetime', required: true },
		end_date: { type: 'datetime', required: false },
		skills: { type: 'options', required: true },
		image: { type: 'asset', required: false },
	},
	item_social_link: {
		name: { type: 'text', required: true },
		url: { type: 'text', required: true },
		icon: { type: 'text', required: true },
	},
	seo_meta: {
		meta_title: { type: 'text', required: true },
		meta_description: { type: 'textarea', required: true },
		canonical_url: { type: 'text', required: false },
		og_image: { type: 'asset', required: false },
		noindex: { type: 'boolean', required: false },
	},
};

describe('CONTRACT-SB-SCHEMA-001', () => {
	it('keeps Storyblok schema v1 components and required fields in local component artifacts', async () => {
		const raw = await readFile(SCHEMA_PATH, 'utf8');
		const components = JSON.parse(raw) as StoryblokComponent[];
		const byName = new Map(
			components.map((component) => [component.name, component]),
		);

		for (const [componentName, expectedFields] of Object.entries(
			REQUIRED_COMPONENT_FIELDS,
		)) {
			const component = byName.get(componentName);
			expect(component, `Missing component: ${componentName}`).toBeDefined();

			for (const [fieldName, expected] of Object.entries(expectedFields)) {
				const field = component?.schema?.[fieldName];
				expect(
					field,
					`Missing field: ${componentName}.${fieldName}`,
				).toBeDefined();
				expect(field?.type).toBe(expected.type);
				if (expected.required) {
					expect(field?.required).toBe(true);
				} else {
					expect(field?.required ?? false).toBe(false);
				}
			}
		}
	});

	it('keeps item_experience as a story-capable relation record for home references', async () => {
		const raw = await readFile(SCHEMA_PATH, 'utf8');
		const components = JSON.parse(raw) as StoryblokComponent[];
		const byName = new Map(
			components.map((component) => [component.name, component]),
		);

		expect(byName.get('item_experience')?.is_root).toBe(true);
	});

	it('enforces text slug fields and required SEO governance for publishable stories', async () => {
		const raw = await readFile(SCHEMA_PATH, 'utf8');
		const components = JSON.parse(raw) as StoryblokComponent[];
		const byName = new Map(
			components.map((component) => [component.name, component]),
		);

		for (const componentName of ['page_project', 'page_writing']) {
			const component = byName.get(componentName);
			const slugField = component?.schema?.slug;
			const seoField = component?.schema?.seo;
			expect(
				slugField,
				`Missing slug field for ${componentName}`,
			).toBeDefined();
			expect(slugField?.type).toBe('text');
			expect(slugField?.required).toBe(true);

			expect(seoField, `Missing seo field for ${componentName}`).toBeDefined();
			expect(seoField?.type).toBe('bloks');
			expect(seoField?.required).toBe(true);
			expect(seoField?.restrict_components).toBe(true);
			expect(seoField?.component_whitelist).toContain('seo_meta');
			expect(seoField?.maximum).toBe(1);
		}

		const seoMeta = byName.get('seo_meta');
		expect(seoMeta?.schema?.meta_title?.required).toBe(true);
		expect(seoMeta?.schema?.meta_description?.required).toBe(true);
	});

	it('keeps editor fields aligned with runtime-backed content values', async () => {
		const raw = await readFile(SCHEMA_PATH, 'utf8');
		const components = JSON.parse(raw) as StoryblokComponent[];
		const byName = new Map(
			components.map((component) => [component.name, component]),
		);

		expect(byName.get('page_home')?.schema?.tech_stack?.type).toBe('custom');
		expect(byName.get('page_home')?.schema?.tech_stack?.field_type).toBe(
			'storyblok-tags',
		);

		expect(byName.get('page_project')?.schema?.stack?.type).toBe('options');
		expect(
			(byName.get('page_project')?.schema?.stack?.options ?? []).length,
		).toBeGreaterThan(0);

		expect(byName.get('item_experience')?.schema?.skills?.type).toBe('options');
		expect(
			(byName.get('item_experience')?.schema?.skills?.options ?? []).length,
		).toBeGreaterThan(0);
	});

	it('keeps Storyblok components/migrations workflow artifacts executable by contract', async () => {
		const workflow = await readFile(WORKFLOW_PATH, 'utf8');
		expect(workflow).toContain('storyblok components push');
		expect(workflow).toContain('storyblok migrations run');
		expect(workflow).toContain('storyblok types generate');

		for (const componentName of Object.keys(REQUIRED_COMPONENT_FIELDS)) {
			const migrationPath = `${MIGRATIONS_DIR}/${componentName}.schema-v1.js`;
			await access(migrationPath, constants.F_OK);
			const migrationSource = await readFile(migrationPath, 'utf8');
			expect(migrationSource).toMatch(/export default function \w+\(block\)/);
		}
	});

	it('keeps storyblok:types wired to Storyblok CLI type generation', async () => {
		const [packageRaw, typesSyncScript] = await Promise.all([
			readFile(PACKAGE_JSON_PATH, 'utf8'),
			readFile(STORYBLOK_TYPES_SYNC_SCRIPT_PATH, 'utf8'),
		]);
		const packageJson = JSON.parse(packageRaw) as PackageJson;

		expect(packageJson.scripts?.['storyblok:types']).toBe(
			'node scripts/storyblok-types-sync.mjs',
		);
		expect(typesSyncScript).toContain('runStoryblokTypesGenerate(spaceId)');
		expect(typesSyncScript).toMatch(/['"]types['"],\s*['"]generate['"]/);
	});

	it('keeps generated Storyblok types aligned to schema v1 component definitions', async () => {
		const [rawSchema, generatedTypes] = await Promise.all([
			readFile(SCHEMA_PATH, 'utf8'),
			readFile(GENERATED_TYPES_PATH, 'utf8'),
		]);
		const components = JSON.parse(rawSchema) as StoryblokComponent[];

		for (const component of components) {
			expect(generatedTypes).toMatch(
				new RegExp(`component:\\s+['"]${component.name}['"]`),
			);
		}

		expect(generatedTypes).toContain('export interface PageHome');
		expect(generatedTypes).toContain('export interface PageProject');
		expect(generatedTypes).toContain('export interface PageWriting');
		expect(generatedTypes).toContain('export interface ItemExperience');
		expect(generatedTypes).toContain(
			'export type ContentType = PageHome | PageProject | PageWriting | ItemExperience;',
		);
	});

	it('detects stale generated Storyblok types when schema v1 changes', async () => {
		const [rawSchema, generatedSchemaTypes, generatedPrimitives] =
			await Promise.all([
				readFile(SCHEMA_PATH, 'utf8'),
				readFile(GENERATED_TYPES_PATH, 'utf8'),
				readFile(GENERATED_PRIMITIVES_PATH, 'utf8'),
			]);
		const expectedSchemaHash = createHash('sha256')
			.update(rawSchema)
			.digest('hex');
		const expectedSchemaSourceLine = `${SCHEMA_SOURCE_PREFIX}${SCHEMA_PATH}`;
		const expectedSchemaHashLine = `${SCHEMA_HASH_PREFIX}${expectedSchemaHash}`;

		expect(generatedSchemaTypes).toContain(expectedSchemaSourceLine);
		expect(generatedSchemaTypes).toContain(expectedSchemaHashLine);
		expect(generatedPrimitives).toContain(expectedSchemaSourceLine);
		expect(generatedPrimitives).toContain(expectedSchemaHashLine);
	});

	it('keeps a publish checklist with slug and SEO governance checks', async () => {
		const checklist = await readFile(PUBLISH_CHECKLIST_PATH, 'utf8');
		expect(checklist).toContain(
			'Slug is unique within its section (`projects/*` or `writing/*`).',
		);
		expect(checklist).toContain(
			'SEO block is present exactly once (`seo` maximum 1 with `seo_meta`).',
		);
		expect(checklist).toContain(
			'`seo_meta.meta_title` and `seo_meta.meta_description` are both filled.',
		);
		expect(checklist).toContain('Storyblok types are regenerated');
	});
});
