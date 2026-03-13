import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const SPACE_ID = '290927119725014';
const SCHEMA_PATH = `data/storyblok/components/${SPACE_ID}/components.schema-v1.json`;
const STORIES_DIR = `data/storyblok/stories/stories/${SPACE_ID}`;
const STORYBLOK_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

type StoryblokField = {
	type?: string;
	required?: boolean;
	options?: Array<{ value?: string }>;
};

type StoryblokComponent = {
	name: string;
	schema?: Record<string, StoryblokField>;
};

type StoryRecord = {
	content?: Record<string, unknown>;
	slug?: string;
};

function isEmptyValue(value: unknown): boolean {
	return (
		value === undefined ||
		value === null ||
		(typeof value === 'string' && value.trim().length === 0) ||
		(Array.isArray(value) && value.length === 0)
	);
}

describe('CONTRACT-SB-STORY-DATA-001', () => {
	it('keeps pulled Storyblok stories structurally aligned with schema field types', async () => {
		const schemaRaw = await readFile(SCHEMA_PATH, 'utf8');
		const components = JSON.parse(schemaRaw) as StoryblokComponent[];
		const fieldsByComponent = new Map(
			components.map((component) => [component.name, component.schema ?? {}]),
		);

		const storyFiles = (await readdir(STORIES_DIR)).filter((file) =>
			file.endsWith('.json'),
		);

		for (const file of storyFiles) {
			const storyRaw = await readFile(`${STORIES_DIR}/${file}`, 'utf8');
			const story = JSON.parse(storyRaw) as StoryRecord;
			const componentName =
				typeof story.content?.component === 'string'
					? story.content.component
					: null;

			if (!componentName) {
				continue;
			}

			const schema = fieldsByComponent.get(componentName) ?? {};
			for (const [fieldName, fieldSchema] of Object.entries(schema)) {
				const value = story.content?.[fieldName];

				if (fieldSchema.required) {
					expect(
						isEmptyValue(value),
						`${file} is missing required field ${componentName}.${fieldName}`,
					).toBe(false);
				}

				if (value === undefined || value === null) {
					continue;
				}

				if (fieldSchema.type === 'options') {
					expect(
						Array.isArray(value),
						`${file} field ${componentName}.${fieldName} must be an array for options schema fields`,
					).toBe(true);

					if (Array.isArray(value) && (fieldSchema.options?.length ?? 0) > 0) {
						const allowedValues = new Set(
							(fieldSchema.options ?? [])
								.map((option) => option.value)
								.filter((option): option is string => Boolean(option)),
						);

						for (const item of value) {
							expect(
								allowedValues.has(String(item)),
								`${file} field ${componentName}.${fieldName} contains unknown option value ${String(item)}`,
							).toBe(true);
						}
					}
				}

				if (
					fieldSchema.type === 'datetime' &&
					typeof value === 'string' &&
					value.trim().length > 0
				) {
					expect(
						STORYBLOK_DATETIME_PATTERN.test(value),
						`${file} field ${componentName}.${fieldName} must use Storyblok editor-friendly datetime format YYYY-MM-DD HH:mm`,
					).toBe(true);
				}
			}
		}
	});
});
