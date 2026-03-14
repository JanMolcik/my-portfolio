import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import TerminalNoirWriting from '@/components/writing/terminal-noir-writing';
import { buildWritingJsonLd, serializeJsonLd } from '@/lib/seo/json-ld';
import {
	getPublishedRouteParamsByPrefix,
	getPublishedStory,
} from '@/lib/storyblok/content';
import { buildNotFoundMetadata, buildStoryMetadata } from '@/lib/seo/metadata';
import { mapWritingDtoToDomain } from '@/lib/storyblok/mappers';
import { getStoryblokRequestMode } from '@/lib/storyblok/preview-mode';

type WritingPageProps = {
	params: Promise<{ slug: string }>;
};

export const revalidate = 3600;
export const dynamic = 'force-static';
export const dynamicParams = true;

const loadWritingStory = cache(
	async (
		slug: string,
		mode: Awaited<ReturnType<typeof getStoryblokRequestMode>>,
	) => getPublishedStory(`writing/${slug}`, mode),
);

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
	return getPublishedRouteParamsByPrefix('writing/');
}

export async function generateMetadata({
	params,
}: WritingPageProps): Promise<Metadata> {
	const { slug } = await params;
	const mode = await getStoryblokRequestMode();
	const story = await loadWritingStory(slug, mode);
	if (!story) {
		return buildNotFoundMetadata('Writing |');
	}
	return buildStoryMetadata(story, `/writing/${slug}`, 'article');
}

export default async function WritingPage({ params }: WritingPageProps) {
	const { slug } = await params;
	const mode = await getStoryblokRequestMode();
	const story = await loadWritingStory(slug, mode);
	if (!story) {
		notFound();
	}

	const writing = mapWritingDtoToDomain(story.content, slug);
	const jsonLd = buildWritingJsonLd(writing);
	return (
		<>
			<script
				dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
				type="application/ld+json"
			/>
			<TerminalNoirWriting writing={writing} />
		</>
	);
}
