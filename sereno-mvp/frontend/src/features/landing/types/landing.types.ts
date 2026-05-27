import type { LucideIcon } from 'lucide-react';

export interface FlowStep {
  title: string;
  description: string;
  order: number;
}

export interface LandingFeature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface LandingTestimonial {
  text: string;
  author: string;
  location: string;
}

export interface LandingPlan {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  period: string;
  highlighted: boolean;
  available: boolean;
  features: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface HeroIntroSlide {
  kind: 'intro';
  id: 'intro';
  eyebrow: string;
  title: string;
  description: string;
  footnote: string;
}

export type HeroImageMaxWidthToken = '2xl' | '3xl' | '4xl';

export interface HeroFeatureSlide {
  kind: 'feature';
  id: string;
  url: string;
  title: string;
  description: string;
  imageMaxWidthToken?: HeroImageMaxWidthToken;
  /** Desktop (`sm+`) max width in pixels; mobile uses viewport-based width. */
  imageMaxWidthPx?: number;
}

export type HeroSlide = HeroIntroSlide | HeroFeatureSlide;

export interface HeaderNavLink {
  label: string;
  sectionId: string;
}

export interface LandingContactInfo {
  phoneDisplay: string;
  phoneUri: string;
  email: string;
  instagramUrl: string;
  instagramHandle: string;
}
