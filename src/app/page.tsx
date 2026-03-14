import {
	StoryblokLiveEditing,
	StoryblokServerComponent,
	storyblokEditable,
	type SbBlokData,
} from '@storyblok/react/rsc';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import TerminalNoirHome from '@/components/home/terminal-noir-home';
import { buildHomeJsonLd, serializeJsonLd } from '@/lib/seo/json-ld';
import { buildNotFoundMetadata, buildStoryMetadata } from '@/lib/seo/metadata';
import {
	getPublishedHomeStory,
	getPublishedStory,
	type StoryblokResolvedRelationStory,
} from '@/lib/storyblok/content';
import { buildHomePageModel } from '@/lib/storyblok/home-page';
import { getStoryblokRequestMode } from '@/lib/storyblok/preview-mode';
import {
	STORYBLOK_DRAFT_VERSION,
	STORYBLOK_PUBLISHED_VERSION,
	type StoryblokContentMode,
} from '@/lib/storyblok/queries';

type HomeStory = NonNullable<Awaited<ReturnType<typeof getPublishedStory>>>;

export const revalidate = 3600;
export const dynamic = 'force-static';

function parseBooleanFlag(
	value: string | undefined,
	fallback: boolean,
): boolean {
	if (value === undefined) {
		return fallback;
	}

	const normalized = value.trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(normalized)) {
		return true;
	}
	if (['0', 'false', 'no', 'off'].includes(normalized)) {
		return false;
	}
	return fallback;
}

function shouldUseLocalDraftFallback(mode: StoryblokContentMode): boolean {
	if (mode !== STORYBLOK_PUBLISHED_VERSION) {
		return false;
	}

	return parseBooleanFlag(
		process.env.STORYBLOK_LOCAL_DRAFT_FALLBACK,
		process.env.NODE_ENV !== 'production',
	);
}

function resolveStoryComponent(story: HomeStory): string {
	const content = story.content as Record<string, unknown>;
	const component = content?.component;
	return typeof component === 'string' ? component : '';
}

function asBlokData(story: HomeStory): SbBlokData {
	return story.content as SbBlokData;
}

function getSocialLinkBloks(story: HomeStory): SbBlokData[] {
	const content = asBlokData(story) as Record<string, unknown>;
	if (!Array.isArray(content.social_links)) {
		return [];
	}

	return content.social_links.filter((item): item is SbBlokData =>
		Boolean(item && typeof item === 'object' && !Array.isArray(item)),
	);
}

const resolveHomeStory = cache(
	async (
		mode: StoryblokContentMode,
	): Promise<{
		mode: StoryblokContentMode;
		story: HomeStory | null;
		rels: StoryblokResolvedRelationStory[];
	}> => {
		const payload = await getPublishedHomeStory(mode);
		if (payload) {
			return {
				mode,
				story: payload.story,
				rels: payload.rels,
			};
		}

		if (!shouldUseLocalDraftFallback(mode)) {
			return {
				mode,
				story: null,
				rels: [],
			};
		}

		const fallbackPayload = await getPublishedHomeStory(
			STORYBLOK_DRAFT_VERSION,
		);
		if (!fallbackPayload) {
			return {
				mode,
				story: null,
				rels: [],
			};
		}

		return {
			mode: STORYBLOK_DRAFT_VERSION,
			story: fallbackPayload.story,
			rels: fallbackPayload.rels,
		};
	},
);

export async function generateMetadata(): Promise<Metadata> {
	const mode = await getStoryblokRequestMode();
	const resolved = await resolveHomeStory(mode);
	if (!resolved.story) {
		return buildNotFoundMetadata('Home |');
	}
	return buildStoryMetadata(resolved.story, '/');
}

export default async function HomePage() {
	const mode = await getStoryblokRequestMode();
	const resolved = await resolveHomeStory(mode);
	if (!resolved.story) {
		notFound();
	}

	const story = resolved.story;
	const storyComponent = resolveStoryComponent(story);
	const showLiveEditing = resolved.mode === STORYBLOK_DRAFT_VERSION;

	if (storyComponent === 'page') {
		return (
			<>
				{showLiveEditing ? <StoryblokLiveEditing story={story} /> : null}
				<StoryblokServerComponent blok={asBlokData(story)} />
			</>
		);
	}

	const model = buildHomePageModel(story, resolved.rels);
	const jsonLd = buildHomeJsonLd(model);
	const editableProps = storyblokEditable(asBlokData(story));

	return (
		<>
			{showLiveEditing ? <StoryblokLiveEditing story={story} /> : null}
			<script
				dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
				type="application/ld+json"
			/>
			<div {...editableProps}>
				<TerminalNoirHome
					model={model}
					socialLinkBloks={getSocialLinkBloks(story)}
				/>
			</div>
		</>
	);
}
