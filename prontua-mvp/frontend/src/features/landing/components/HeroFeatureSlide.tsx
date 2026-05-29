import type { HeroFeatureSlide as HeroFeatureSlideData } from '../types/landing.types';
import { resolveHeroFeatureImageMaxWidthClass } from '../constants/landing-carousel-layout.constants';

interface HeroFeatureSlideProps {
  slide: HeroFeatureSlideData;
  eagerLoad: boolean;
}

export function HeroFeatureSlide({ slide, eagerLoad }: HeroFeatureSlideProps) {
  const imageMaxWidthClass = resolveHeroFeatureImageMaxWidthClass(
    slide.imageMaxWidthToken,
    slide.imageMaxWidthPx,
  );

  return (
    <div className="flex flex-col items-center gap-10 px-1 text-center sm:gap-6 sm:px-4">
      <img
        src={slide.url}
        alt={slide.description}
        className={`w-full ${imageMaxWidthClass} rounded-2xl border border-sage/15 bg-white shadow-lg`}
        loading={eagerLoad ? 'eager' : 'lazy'}
        decoding="async"
      />
      <div className="flex flex-col items-center gap-3 sm:gap-2">
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          {slide.title}
        </h2>
        <p className="max-w-xl text-base text-muted sm:text-lg">
          {slide.description}
        </p>
      </div>
    </div>
  );
}
