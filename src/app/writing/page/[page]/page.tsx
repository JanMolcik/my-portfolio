import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import TerminalNoirWritingIndex from '@/components/writing/terminal-noir-writing-index';
import { buildNotFoundMetadata, buildRouteMetadata } from '@/lib/seo/metadata';
import { getStoryblokRequestMode } from '@/lib/storyblok/preview-mode';
import {
	getPublishedWritingList,
	getPublishedWritingPageParams,
} from '@/lib/storyblok/writing';

type WritingPaginatedPageProps = {
	params: Promise<{ page: string }>;
};

export const revalidate = 3600;
export const dynamic = 'force-static';
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ page: string }>> {
	return getPublishedWritingPageParams();
}

function parsePageParam(value: string): number | null {
	const page = Number(value);
	return Number.isInteger(page) && page > 0 ? page : null;
}

export async function generateMetadata({
	params,
}: WritingPaginatedPageProps): Promise<Metadata> {
	const { page: rawPage } = await params;
	const page = parsePageParam(rawPage);
	if (!page) {
		return buildNotFoundMetadata('Writing |');
	}
	if (page === 1) {
		return buildRouteMetadata({
			title: 'Writing / notes',
			description:
				'Engineering notes, experiments, sourced summaries, and long-form writing.',
			path: '/writing',
		});
	}
	return buildRouteMetadata({
		title: `Writing / notes — page ${page}`,
		description: `Page ${page} of engineering notes, experiments, sourced summaries, and long-form writing.`,
		path: `/writing/page/${page}`,
	});
}

export default async function WritingPaginatedPage({
	params,
}: WritingPaginatedPageProps) {
	const { page: rawPage } = await params;
	const page = parsePageParam(rawPage);
	if (!page) {
		notFound();
	}
	if (page === 1) {
		redirect('/writing');
	}

	const mode = await getStoryblokRequestMode();
	const result = await getPublishedWritingList({ page, mode });
	if (
		(result.total === 0 && page > 1) ||
		(result.total > 0 && page > result.totalPages)
	) {
		notFound();
	}

	return <TerminalNoirWritingIndex currentPage={page} result={result} />;
}
