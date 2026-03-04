import type { Metadata } from 'next';
import { StoryblokStory } from '@storyblok/react/rsc';
import { notFound } from 'next/navigation';
import { getPublishedStory } from '@/lib/storyblok/content';
import { buildNotFoundMetadata, buildStoryMetadata } from '@/lib/seo/metadata';

export const revalidate = 3600;
export const dynamic = 'force-static';

export async function generateMetadata(): Promise<Metadata> {
	const story = await getPublishedStory('home');
	if (!story) {
		return buildNotFoundMetadata('Home |');
	}
	return buildStoryMetadata(story, '/');
}

export default async function HomePage() {
	const story = await getPublishedStory('home');
	if (!story) {
		notFound();
	}

	return <StoryblokStory story={story} />;
}
