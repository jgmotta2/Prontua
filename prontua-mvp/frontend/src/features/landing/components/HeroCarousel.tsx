import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HERO_SLIDES } from '../constants/landing-content';
import { useHeroCarousel } from '../hooks/useHeroCarousel';
import { HeroFeatureSlide } from './HeroFeatureSlide';
import { HeroIntroSlide } from './HeroIntroSlide';

export function HeroCarousel() {
  const { viewportRef, activeIndex, scrollNext, scrollPrevious, scrollTo } =
    useHeroCarousel();

  return (
    <div
      className="relative mx-auto w-full max-w-5xl"
      aria-roledescription="carousel"
      aria-label="Apresentação do Prontua"
    >
      <div ref={viewportRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {HERO_SLIDES.map((slide, index) => (
            <article
              key={slide.id}
              className="min-w-0 flex-[0_0_100%]"
              aria-hidden={index !== activeIndex}
            >
              {slide.kind === 'intro' ? (
                <HeroIntroSlide slide={slide} />
              ) : (
                <HeroFeatureSlide slide={slide} eagerLoad={index === 1} />
              )}
            </article>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={scrollPrevious}
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-sage/30 bg-white/95 p-2.5 shadow-soft backdrop-blur transition-colors hover:bg-white sm:left-2"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="h-5 w-5 text-ink" aria-hidden />
      </button>

      <button
        type="button"
        onClick={scrollNext}
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-sage/30 bg-white/95 p-2.5 shadow-soft backdrop-blur transition-colors hover:bg-white sm:right-2"
        aria-label="Próximo slide"
      >
        <ChevronRight className="h-5 w-5 text-ink" aria-hidden />
      </button>

      <div
        className="mt-6 flex justify-center gap-2"
        role="tablist"
        aria-label="Slides do carrossel"
      >
        {HERO_SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={slide.title}
            onClick={() => scrollTo(index)}
            className={`h-2 rounded-full transition-all ${
              index === activeIndex
                ? 'w-6 bg-sage'
                : 'w-2 bg-sage/30 hover:bg-sage/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
