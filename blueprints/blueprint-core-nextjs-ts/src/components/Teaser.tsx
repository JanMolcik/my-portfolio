import { storyblokEditable } from '@storyblok/react/rsc';
import { TeaserBlok } from '@/types/storyblok';

type TeaserProps = {
  blok: TeaserBlok;
};

const Teaser = ({ blok }: TeaserProps) => {
  return (
    <div className="teaser" {...storyblokEditable(blok)}>
      <h1>{blok.headline}</h1>
    </div>
  );
};

export default Teaser;
