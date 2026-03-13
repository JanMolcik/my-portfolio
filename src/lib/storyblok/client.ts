import Page from '@/components/Page';
import Feature from '@/components/Feature';
import Grid from '@/components/Grid';
import Teaser from '@/components/Teaser';
import { apiPlugin, storyblokInit } from '@storyblok/react/rsc';

const storyblokAccessToken =
	process.env.STORYBLOK_ACCESS_TOKEN ||
	process.env.STORYBLOK_DELIVERY_API_TOKEN ||
	process.env.STORYBLOK_PREVIEW_TOKEN;

export const getStoryblokApi = storyblokInit({
	accessToken: storyblokAccessToken,
	use: [apiPlugin],
	components: {
		page: Page,
		feature: Feature,
		grid: Grid,
		teaser: Teaser,
	},
	apiOptions: {
		// Set the correct region for your space. Learn more: https://www.storyblok.com/docs/packages/storyblok-js#example-region-parameter
		region: process.env.STORYBLOK_REGION || 'eu',
		// Required when creating a Storyblok space directly via the Blueprints feature.
		endpoint: process.env.STORYBLOK_API_BASE_URL
			? `${new URL(process.env.STORYBLOK_API_BASE_URL).origin}/v2`
			: undefined,
	},
});
