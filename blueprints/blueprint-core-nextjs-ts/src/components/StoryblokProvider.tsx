'use client';

import type { ReactNode } from 'react';
import { getStoryblokApi } from '@/lib/storyblok';

type StoryblokProviderProps = {
  children: ReactNode;
};

export default function StoryblokProvider({ children }: StoryblokProviderProps) {
  getStoryblokApi();
  return children;
}
