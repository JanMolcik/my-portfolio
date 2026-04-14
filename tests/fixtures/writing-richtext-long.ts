import type { RichTextDomain } from '@/lib/storyblok/mappers';

const paragraphSeed =
	'Agentic systems become useful when the workflow is explicit, observable, and grounded in source material. The note explains how retrieval, planning, evaluation, and human review fit together without turning the article into a transcript. Each section adds practical commentary, cites the original context, and keeps the Storyblok richtext shape as the delivery format for runtime rendering.';

const longParagraphs = Array.from({ length: 14 }, (_, index) => ({
	type: 'paragraph',
	content: [
		{
			type: 'text',
			text: `${paragraphSeed} Iteration ${index + 1} records a concrete lesson, a failure mode, and a mitigation that can be checked by future readers.`,
		},
	],
}));

export const longWritingRichTextFixture: RichTextDomain = {
	type: 'doc',
	content: [
		{
			type: 'heading',
			attrs: { level: 2 },
			content: [{ type: 'text', text: 'Source and context' }],
		},
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'This long-form fixture includes ' },
				{
					type: 'text',
					text: 'bold emphasis',
					marks: [{ type: 'bold' }],
				},
				{ type: 'text', text: ', ' },
				{
					type: 'text',
					text: 'italic commentary',
					marks: [{ type: 'italic' }],
				},
				{ type: 'text', text: ', inline ' },
				{
					type: 'text',
					text: 'retrieval',
					marks: [{ type: 'code' }],
				},
				{ type: 'text', text: ', and an external ' },
				{
					type: 'text',
					text: 'source link',
					marks: [
						{
							type: 'link',
							attrs: {
								href: 'https://example.com/source',
								target: '_blank',
							},
						},
					],
				},
				{ type: 'text', text: '.' },
			],
		},
		{
			type: 'heading',
			attrs: { level: 3 },
			content: [{ type: 'text', text: 'Practical takeaways' }],
		},
		{
			type: 'bullet_list',
			content: [
				{
					type: 'list_item',
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', text: 'Keep retrieval grounded.' }],
						},
					],
				},
				{
					type: 'list_item',
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', text: 'Measure the agent loop.' }],
						},
					],
				},
			],
		},
		{
			type: 'ordered_list',
			content: [
				{
					type: 'list_item',
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', text: 'Draft locally in Markdown.' }],
						},
					],
				},
				{
					type: 'list_item',
					content: [
						{
							type: 'paragraph',
							content: [
								{ type: 'text', text: 'Publish through Storyblok richtext.' },
							],
						},
					],
				},
			],
		},
		{
			type: 'blockquote',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'A useful summary credits the original source and adds new operational judgment.',
						},
					],
				},
			],
		},
		{
			type: 'heading',
			attrs: { level: 4 },
			content: [{ type: 'text', text: 'Prompt sketch' }],
		},
		{
			type: 'code_block',
			attrs: { language: 'text' },
			content: [
				{
					type: 'text',
					text: '# Plan\\nretrieve context -> draft summary -> verify sources -> publish richtext',
				},
			],
		},
		...longParagraphs,
	],
};

export const longWritingWordCount = (longWritingRichTextFixture.content ?? [])
	.map((node) => JSON.stringify(node))
	.join(' ')
	.split(/\s+/)
	.filter((word) => /[A-Za-z]/.test(word)).length;
