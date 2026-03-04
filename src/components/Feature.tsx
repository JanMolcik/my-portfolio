import { storyblokEditable } from '@storyblok/react/rsc';
import { FeatureBlok } from '@/types/storyblok';

type FeatureProps = {
	blok: FeatureBlok;
};

const Feature = ({ blok }: FeatureProps) => {
	return (
		<div className="feature" {...storyblokEditable(blok)}>
			<span>{blok.name}</span>
		</div>
	);
};

export default Feature;
