import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/**
 * Shown when an assessment exists but cannot be taken in this locale.
 *
 * This is a product statement, not an error: the instrument has no officially
 * validated translation here, and translating a validated scale ourselves
 * would void the validation it is chosen for. Saying so plainly is better than
 * a generic "not found".
 */
export function AssessmentUnavailable({ fallbackHref }: { fallbackHref: string }) {
  const t = useTranslations('runner');
  return (
    <section className="runner runner-unavailable">
      <div className="wrap runner-inner">
        <h1>{t('unavailableTitle')}</h1>
        <p className="runner-lead">{t('unavailableLead')}</p>
        <div className="runner-actions">
          <Link className="button button-primary" href={fallbackHref}>
            {t('unavailableCta')} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
