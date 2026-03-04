import {
  storyblokEditable,
  StoryblokServerComponent,
} from '@storyblok/react/rsc';
import { GridBlok } from '@/types/storyblok';

type GridProps = {
  blok: GridBlok;
};

const Grid = ({ blok }: GridProps) => (
  <div {...storyblokEditable(blok)} className="grid">
    {blok.columns?.map((nestedBlok) => (
      <StoryblokServerComponent blok={nestedBlok} key={nestedBlok._uid} />
    ))}
  </div>
);

export default Grid;
