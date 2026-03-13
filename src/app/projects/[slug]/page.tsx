import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TerminalNoirProject from '@/components/projects/terminal-noir-project';
import { buildProjectJsonLd, serializeJsonLd } from '@/lib/seo/json-ld';
import {
	getPublishedRouteParamsByPrefix,
	getPublishedStory,
} from '@/lib/storyblok/content';
import { buildNotFoundMetadata, buildStoryMetadata } from '@/lib/seo/metadata';
import { mapProjectDtoToDomain } from '@/lib/storyblok/mappers';
import { getStoryblokRequestMode } from '@/lib/storyblok/preview-mode';

type ProjectPageProps = {
	params: Promise<{ slug: string }>;
};

export const revalidate = 3600;
export const dynamic = 'force-static';
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
	return getPublishedRouteParamsByPrefix('projects/');
}

export async function generateMetadata({
	params,
}: ProjectPageProps): Promise<Metadata> {
	const { slug } = await params;
	const mode = await getStoryblokRequestMode();
	const story = await getPublishedStory(`projects/${slug}`, mode);
	if (!story) {
		return buildNotFoundMetadata('Project |');
	}
	return buildStoryMetadata(story, `/projects/${slug}`);
}

export default async function ProjectPage({ params }: ProjectPageProps) {
	const { slug } = await params;
	const mode = await getStoryblokRequestMode();
	const story = await getPublishedStory(`projects/${slug}`, mode);
	if (!story) {
		notFound();
	}

	const project = mapProjectDtoToDomain(story.content, slug);
	const jsonLd = buildProjectJsonLd(project);
	return (
		<>
			<script
				dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
				type="application/ld+json"
			/>
			<TerminalNoirProject project={project} />
		</>
	);
}
