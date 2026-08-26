'use client';

import { useEffect } from 'react';
import { Lock, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ASRS_DOMAINS, type AsrsDomain } from '@/domain/assessment/instruments/asrs18';
import type { ScoreResult } from '@/domain/assessment/types';
import { track } from '@/lib/analytics';
import { DomainSegments } from './DomainSegments';
import { LeadCapture } from './LeadCapture';
import { NextAssessment } from './NextAssessment';
import { StatusBadge } from './StatusBadge';
import { UnlockButton } from './UnlockButton';

/**
 * The free result.
 *
 * Section 7 wants it to carry real value rather than tease a paywall, and
 * section 15 governs how it may speak: this screen never says the person has
 * ADHD. The strongest claim available is the instrument's own — "highly
 * consistent", followed by a recommendation to seek assessment.
 *
 * Two rules hold regardless of what the paywall eventually does:
 *
 *  - "What to do with this" — the recommendation to see a professional — is
 *    always free, above the offer, for both bands. Putting the message that
 *    someone should seek help behind a payment is indefensible for a health
 *    product, whatever it does to conversion.
 *  - Someone who screens below the cutoff gets a route of their own instead of
 *    an offer that makes no sense for them.
 *
 * ORDER. The price is stated before anything is asked of the reader.
 *
 * EMAIL. On the elevated branch there is no free email capture: it competed
 * with the paid offer and made "we email it to you" look like the product,
 * when the product is the analysis. Delivery moves into the post-purchase
 * step. On the not-elevated branch it stays, because there is nothing to sell
 * there and removing it would leave that whole segment with no path at all.
 *
 * The report's contents live inside the offer card rather than in a card of
 * their own — a contents list IS the description of what is being bought, so
 * separating them made the page longer and said the same thing twice.
 *
 * Everything shown is derived from `ScoreResult`. No interpretation is
 * invented here; the band decides which copy key is read.
 */

const REPORT_SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;

export function AssessmentResult({
  result,
  contextAnswers = {},
  sessionId,
  onRestart,
}: {
  result: ScoreResult;
  sessionId?: string;
  /** Context answers, if the person gave any. Personalise presentation only. */
  contextAnswers?: Record<string, string | undefined>;
  onRestart: () => void;
}) {
  const t = useTranslations('result_screen');
  const tr = useTranslations('report_preview');

  const band = result.bands['partA-screen'] ?? 'notElevated';
  const elevated = band === 'highlyConsistent';
  const count = result.scores['partA-screen'] ?? 0;

  // Part A and Part B report which items landed in range; grouping them by
  // symptom domain is the most a screening result can honestly say.
  const flagged = new Set([
    ...(result.flagged['partA-detail'] ?? []),
    ...(result.flagged['partB-detail'] ?? []),
  ]);

  useEffect(() => {
    track('result_viewed', { assessment: result.assessmentId, band });
    if (elevated) track('premium_offer_viewed', { assessment: result.assessmentId });
    else track('next_assessment_offer_viewed', { assessment: result.assessmentId });
  }, [result.assessmentId, band, elevated]);

  const domains = (Object.keys(ASRS_DOMAINS) as AsrsDomain[]).map((domain) => {
    const items = ASRS_DOMAINS[domain];
    return { domain, flagged: items.filter((id) => flagged.has(id)).length, total: items.length };
  });

  const setting = contextAnswers.ctxSetting;

  return (
    <section className="runner result-screen">
      <div className="wrap runner-inner">
        <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
        <h1>{t('title')}</h1>

        <div className={`result-band ${elevated ? 'is-elevated' : ''}`}>
          <div className="result-band-head">
            <p className="result-band-label">{t('screenLabel')}</p>
            <StatusBadge band={band} />
          </div>
          <p className="result-band-count">{t('screenCount', { count })}</p>
          <p className="result-band-cutoff">{t('cutoffNote')}</p>
          <h2>{t(elevated ? 'highlyConsistentTitle' : 'notElevatedTitle')}</h2>
          <p>{t(elevated ? 'highlyConsistentSummary' : 'notElevatedSummary')}</p>
        </div>

        <div className="result-domains">
          <h2>{t('domainsTitle')}</h2>
          <p className="runner-lead">{t('domainsLead')}</p>
          <ul>
            {domains.map(({ domain, flagged: hit, total }) => (
              <li key={domain}>
                <div className="result-domain-head">
                  <span>{t(domain)}</span>
                  <b>{hit === 0 ? t('domainNone') : t('domainCount', { flagged: hit, total })}</b>
                </div>
                <DomainSegments
                  filled={hit}
                  total={total}
                  label={t('domainSegmentsLabel', { domain: t(domain), flagged: hit, total })}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Free, always, and before any offer. See the note at the top. */}
        <div className="result-next">
          <h2>{t('nextTitle')}</h2>
          <p>{t(elevated ? 'nextElevated' : 'nextNotElevated')}</p>
          {/* The only thing a context answer changes: one extra line that
              speaks to where the person said it shows up. It adds nothing to
              the score and its absence changes nothing else on this screen. */}
          {setting ? <p className="result-context-note">{t(`settingNote.${setting}`)}</p> : null}
        </div>

        {elevated ? (
          <div className="result-premium">
            <h2>{t('premiumTitle')}</h2>
            <p className="runner-lead">{t('premiumLead')}</p>

            {/* The contents ARE the description of what is bought. What may be
                locked is limited on purpose: every section is interpretive
                depth. The recommendation to seek professional assessment sits
                in the free result above and stays there. */}
            <ol className="report-sections">
              {REPORT_SECTIONS.map((key, i) => (
                <li key={key}>
                  <span className="report-section-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="report-section-name">{tr(key)}</span>
                  <Lock size={14} aria-hidden="true" className="report-section-lock" />
                </li>
              ))}
            </ol>
            <p className="sr-only">{tr('lockedNote', { count: REPORT_SECTIONS.length })}</p>

            <div className="price">
              {t('premiumPrice')} <small>{t('premiumPriceNote')}</small>
            </div>
            <UnlockButton sessionId={sessionId} />

            <p className="result-delivery">{t('deliveryNote')}</p>
          </div>
        ) : (
          <>
            <LeadCapture
              assessmentId={result.assessmentId}
              sessionId={sessionId}
              variant="primary"
            />
            <NextAssessment assessmentId={result.assessmentId} />
          </>
        )}

        <p className="runner-disclaimer">{t('disclaimer')}</p>

        <div className="runner-actions">
          <button type="button" className="button button-ghost" onClick={onRestart}>
            <RotateCcw size={15} aria-hidden="true" /> {t('restart')}
          </button>
        </div>
      </div>
    </section>
  );
}
