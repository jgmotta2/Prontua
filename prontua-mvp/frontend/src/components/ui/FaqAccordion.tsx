import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqAccordionProps {
  question: string;
  answer: string;
  initiallyOpen?: boolean;
}

export function FaqAccordion({
  question,
  answer,
  initiallyOpen = false,
}: FaqAccordionProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const panelId = `faq-${question.slice(0, 24).replace(/\s/g, '-')}`;

  return (
    <div className="rounded-2xl border border-sage/15 bg-white shadow-soft overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="font-medium text-ink">{question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-sage transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        role="region"
        hidden={!isOpen}
        className="border-t border-sage/10 px-5 pb-4 pt-0"
      >
        <p className="text-sm leading-relaxed text-muted">{answer}</p>
      </div>
    </div>
  );
}
