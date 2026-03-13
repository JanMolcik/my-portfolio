import { draftMode } from 'next/headers';
import {
	STORYBLOK_DRAFT_VERSION,
	STORYBLOK_PUBLISHED_VERSION,
	type StoryblokContentMode,
} from './queries';

export async function getStoryblokRequestMode(): Promise<StoryblokContentMode> {
	try {
		const preview = await draftMode();
		return preview.isEnabled
			? STORYBLOK_DRAFT_VERSION
			: STORYBLOK_PUBLISHED_VERSION;
	} catch {
		return STORYBLOK_PUBLISHED_VERSION;
	}
}
