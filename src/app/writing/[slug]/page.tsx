import type { Metadata } from 'next';
import { StoryblokStory } from '@storyblok/react/rsc';
import { notFound } from 'next/navigation';
import {
	getPublishedRouteParamsByPrefix,
	getPublishedStory,
} from '@/lib/storyblok/content';
import { buildNotFoundMetadata, buildStoryMetadata } from '@/lib/seo/metadata';

type WritingPageProps = {
	params: Promise<{ slug: string }>;
};

export const revalidate = 3600;
export const dynamic = 'force-static';
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
	return getPublishedRouteParamsByPrefix('writing/');
}

export async function generateMetadata({
	params,
}: WritingPageProps): Promise<Metadata> {
	const { slug } = await params;
	const story = await getPublishedStory(`writing/${slug}`);
	if (!story) {
		return buildNotFoundMetadata('Writing |');
	}
	return buildStoryMetadata(story, `/writing/${slug}`);
}

export default async function WritingPage({ params }: WritingPageProps) {
	const { slug } = await params;
	const story = await getPublishedStory(`writing/${slug}`);
	if (!story) {
		notFound();
	}

	return <StoryblokStory story={story} />;
}
