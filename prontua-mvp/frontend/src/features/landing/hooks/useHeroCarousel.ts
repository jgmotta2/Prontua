import { useCallback, useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { HERO_CAROUSEL_INTERVAL_MS } from '../constants/landing-content';

export function useHeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const plugins = useMemo(
    () => [
      Autoplay({
        delay: HERO_CAROUSEL_INTERVAL_MS,
        stopOnMouseEnter: false,
      }),
    ],
    [],
  );

  const [viewportRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center' },
    plugins,
  );

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollPrevious = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const onSelect = (): void => {
      setActiveIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  return {
    viewportRef,
    activeIndex,
    scrollNext,
    scrollPrevious,
    scrollTo,
  };
}
