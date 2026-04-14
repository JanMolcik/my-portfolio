import type { Metadata } from 'next';
import TerminalNoirWritingIndex from '@/components/writing/terminal-noir-writing-index';
import { buildRouteMetadata } from '@/lib/seo/metadata';
import { getStoryblokRequestMode } from '@/lib/storyblok/preview-mode';
import { getPublishedWritingList } from '@/lib/storyblok/writing';

export const revalidate = 3600;
export const dynamic = 'force-static';

export const metadata: Metadata = buildRouteMetadata({
	title: 'Writing / notes',
	description:
		'Engineering notes, experiments, sourced summaries, and long-form writing.',
	path: '/writing',
});

export default async function WritingIndexPage() {
	const mode = await getStoryblokRequestMode();
	const result = await getPublishedWritingList({ page: 1, mode });
	return <TerminalNoirWritingIndex currentPage={1} result={result} />;
}
