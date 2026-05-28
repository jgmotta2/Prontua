import type { HeroFeatureSlide as HeroFeatureSlideData } from '../types/landing.types';

interface HeroFeatureSlideProps {
  slide: HeroFeatureSlideData;
  eagerLoad: boolean;
}

export function HeroFeatureSlide({ slide, eagerLoad }: HeroFeatureSlideProps) {
  return (
    <div className="flex flex-col items-center px-4 text-center">
      <img
        src={slide.url}
        alt={slide.description}
        className="w-full max-w-4xl rounded-2xl border border-sage/15 bg-white shadow-lg"
        loading={eagerLoad ? 'eager' : 'lazy'}
        decoding="async"
      />
      <h2 className="mt-6 font-display text-2xl font-semibold text-ink sm:text-3xl">
        {slide.title}
      </h2>
      <p className="mt-2 max-w-xl text-base text-muted sm:text-lg">
        {slide.description}
      </p>
    </div>
  );
}
