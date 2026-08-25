'use client';

import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import {
  AVAILABLE_ASSESSMENTS,
  assessmentLandingPath,
  catalogPath,
} from '@/content/landing';
import { track } from '@/lib/analytics';

/**
 * Where someone goes when the screening did not come back elevated.
 *
 * Until now this was the end of the funnel: the premium offer is "understand
 * this result in depth", which is not something a person who just learned the
 * pattern is not there wants to buy. A large share of finishers landed here
 * and left.
 *
 * What it deliberately does NOT do is claim another test will explain them.
 * Attention is one explanation among several, and the honest offer is another
 * lens, not an answer. Every other assessment is still `available: false`, so
 * this points at the catalogue and says plainly what is coming rather than
 * linking to something that would 404.
 */
export function NextAssessment({ assessmentId }: { assessmentId: string }) {
  const t = useTranslations('result_next_assessment');
  const locale = useLocale() as Locale;

  const others = AVAILABLE_ASSESSMENTS.filter((a) => a.id !== assessmentId);
  const strip = (path: string) => path.replace(`/${locale}`, '') || '/';

  return (
    <div className="result-next-assessment">
      <h2>{t('title')}</h2>
      <p className="runner-lead">{t('lead')}</p>

      <ul className="benefits">
        <li>{t('b1')}</li>
        <li>{t('b2')}</li>
        <li>{t('b3')}</li>
      </ul>

      {others.length > 0 ? (
        <Link
          className="button button-primary"
          href={strip(assessmentLandingPath(locale, others[0]))}
          onClick={() => track('next_assessment_clicked', { from: assessmentId, to: others[0].id })}
        >
          {t('cta')} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <>
          <Link
            className="button button-ghost"
            href={strip(catalogPath(locale))}
            onClick={() => track('next_assessment_clicked', { from: assessmentId, to: 'catalog' })}
          >
            {t('catalogCta')} <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <p className="runner-hint">{t('soon')}</p>
        </>
      )}
    </div>
  );
}
