'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FAQ_IDS } from '@/content/landing';

export function FaqList() {
  const t = useTranslations('faq');
  const [open, setOpen] = useState<string | null>(FAQ_IDS[0]);

  return (
    <div className="faq-list reveal">
      {FAQ_IDS.map((id) => {
        const isOpen = open === id;
        return (
          <div className="faq-item" key={id}>
            <h3 className="faq-heading">
              <button
                type="button"
                className={`faq-question ${isOpen ? 'open' : ''}`}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${id}`}
                id={`faq-trigger-${id}`}
                onClick={() => setOpen(isOpen ? null : id)}
              >
                {t(`${id}.question`)}
                <Plus size={18} aria-hidden="true" />
              </button>
            </h3>
            {/* The panel stays in the DOM and is hidden with `hidden`, so the
                answers remain crawlable and findable with in-page search. */}
            <div
              id={`faq-panel-${id}`}
              role="region"
              aria-labelledby={`faq-trigger-${id}`}
              className="faq-answer"
              hidden={!isOpen}
            >
              {t(`${id}.answer`)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
