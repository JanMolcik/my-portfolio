import type { Metadata } from 'next';
import { StoryblokStory } from '@storyblok/react/rsc';
import { notFound } from 'next/navigation';
import {
	getPublishedRouteParamsByPrefix,
	getPublishedStory,
} from '@/lib/storyblok/content';
import { buildNotFoundMetadata, buildStoryMetadata } from '@/lib/seo/metadata';

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
	const story = await getPublishedStory(`projects/${slug}`);
	if (!story) {
		return buildNotFoundMetadata('Project |');
	}
	return buildStoryMetadata(story, `/projects/${slug}`);
}

export default async function ProjectPage({ params }: ProjectPageProps) {
	const { slug } = await params;
	const story = await getPublishedStory(`projects/${slug}`);
	if (!story) {
		notFound();
	}

	return <StoryblokStory story={story} />;
}
