import { ArrowRight, Sparkles } from 'lucide-react';
import type { HeroIntroSlide as HeroIntroSlideData } from '../types/landing.types';

interface HeroIntroSlideProps {
  slide: HeroIntroSlideData;
}

export function HeroIntroSlide({ slide }: HeroIntroSlideProps) {
  return (
    <div className="flex min-h-[22rem] flex-col items-center justify-center px-4 text-center sm:min-h-[24rem]">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sage/20 bg-white px-4 py-1.5 text-sm text-sage-dark shadow-soft">
        <Sparkles className="h-4 w-4" aria-hidden />
        <span>{slide.eyebrow}</span>
      </div>

      <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl lg:text-6xl">
        {slide.title}
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl">
        {slide.description}
      </p>

      <div className="mt-10 flex w-full max-w-md flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-4">
        <a href="/app.html" className="btn-primary w-full sm:w-auto">
          Experimente grátis
          <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
        <a href="#como-funciona" className="btn-secondary w-full sm:w-auto">
          Ver como funciona
        </a>
      </div>

      <p className="mt-6 text-sm text-muted">{slide.footnote}</p>
    </div>
  );
}
