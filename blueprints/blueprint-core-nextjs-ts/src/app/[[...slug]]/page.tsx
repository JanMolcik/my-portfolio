import { StoryblokStory } from '@storyblok/react/rsc';
import { getStoryblokApi } from '@/lib/storyblok';

type PageRouteProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page({ params }: PageRouteProps) {
  const { slug } = await params;
  const fullSlug = slug ? slug.join('/') : 'home';

  const sbParams = {
    version: 'draft' as const,
  };

  const storyblokApi = getStoryblokApi();
  const { data } = await storyblokApi.get(`cdn/stories/${fullSlug}`, sbParams);

  return <StoryblokStory story={data.story} />;
}
