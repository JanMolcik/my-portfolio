import {
	storyblokEditable,
	StoryblokServerComponent,
} from '@storyblok/react/rsc';
import { PageBlok } from '@/types/storyblok';

type PageProps = {
	blok: PageBlok;
};

const Page = ({ blok }: PageProps) => (
	<main {...storyblokEditable(blok)}>
		{blok.body?.map((nestedBlok) => (
			<StoryblokServerComponent blok={nestedBlok} key={nestedBlok._uid} />
		))}
	</main>
);

export default Page;
