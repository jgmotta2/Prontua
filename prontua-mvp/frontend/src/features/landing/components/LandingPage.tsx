import { LandingHeader } from './LandingHeader';
import { HeroSection } from './HeroSection';
import { FlowSection } from './FlowSection';
import { FeaturesSection } from './FeaturesSection';
import { TestimonialsSection } from './TestimonialsSection';
import { AudienceSection } from './AudienceSection';
import { PricingSection } from './PricingSection';
import { FaqSection } from './FaqSection';
import { ContactSection } from './ContactSection';
import { CtaSection } from './CtaSection';
import { LandingFooter } from './LandingFooter';

export function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <HeroSection />
        <FlowSection />
        <FeaturesSection />
        <TestimonialsSection />
        <AudienceSection />
        <PricingSection />
        <FaqSection />
        <ContactSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </>
  );
}
