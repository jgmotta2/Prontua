import type { HeroImageMaxWidthToken } from '../types/landing.types';

/** Mobile carousel images use most of the viewport width. */
export const HERO_FEATURE_IMAGE_MOBILE_MAX_WIDTH_VW = 92;

export const RECORDING_SLIDE_DESKTOP_IMAGE_MAX_WIDTH_PX = 450;

export const HERO_FEATURE_IMAGE_MAX_WIDTH_BY_TOKEN: Record<
  HeroImageMaxWidthToken,
  string
> = {
  '2xl': 'max-w-[92vw] sm:max-w-2xl',
  '3xl': 'max-w-[92vw] sm:max-w-3xl',
  '4xl': 'max-w-[92vw] sm:max-w-4xl',
};

export const HERO_FEATURE_IMAGE_MAX_WIDTH_BY_DESKTOP_PX = {
  [RECORDING_SLIDE_DESKTOP_IMAGE_MAX_WIDTH_PX]:
    'max-w-[92vw] sm:max-w-[450px]',
} as const;

export function resolveHeroFeatureImageMaxWidthClass(
  imageMaxWidthToken?: HeroImageMaxWidthToken,
  imageMaxWidthPx?: number,
): string {
  if (imageMaxWidthPx === RECORDING_SLIDE_DESKTOP_IMAGE_MAX_WIDTH_PX) {
    return HERO_FEATURE_IMAGE_MAX_WIDTH_BY_DESKTOP_PX[
      RECORDING_SLIDE_DESKTOP_IMAGE_MAX_WIDTH_PX
    ];
  }

  if (imageMaxWidthPx !== undefined) {
    throw new Error(`Unsupported hero image max width: ${imageMaxWidthPx}px`);
  }

  const token = imageMaxWidthToken ?? '4xl';
  return HERO_FEATURE_IMAGE_MAX_WIDTH_BY_TOKEN[token];
}
