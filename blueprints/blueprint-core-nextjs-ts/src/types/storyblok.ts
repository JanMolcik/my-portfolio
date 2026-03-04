import type { SbBlokData } from '@storyblok/react/rsc';

export type StoryblokBlok = SbBlokData;

export type PageBlok = StoryblokBlok & {
  body?: StoryblokBlok[];
};

export type GridBlok = StoryblokBlok & {
  columns: StoryblokBlok[];
};

export type FeatureBlok = StoryblokBlok & {
  name?: string;
};

export type TeaserBlok = StoryblokBlok & {
  headline?: string;
};
