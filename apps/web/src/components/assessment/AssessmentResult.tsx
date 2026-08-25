'use client';

import { useEffect } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ASRS_DOMAINS, type AsrsDomain } from '@/domain/assessment/instruments/asrs18';
import type { ScoreResult } from '@/domain/assessment/types';
import { track } from '@/lib/analytics';
import { LeadCapture } from './LeadCapture';
import { NextAssessment } from './NextAssessment';

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
 *    always free. Putting the message that someone should seek help behind a
 *    payment is indefensible for a health product, whatever it does to
 *    conversion.
 *  - Someone who screens below the cutoff gets a route of their own instead of
 *    an offer that makes no sense for them. That is a large share of finishers
 *    and, until now, a dead end in the funnel.
 *
 * Everything shown is derived from `ScoreResult`. No interpretation is
 * invented here; the band decides which copy key is read.
 */
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
          <p className="result-band-label">{t('screenLabel')}</p>
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
                <div className="result-domain-track" aria-hidden="true">
                  <span style={{ width: `${Math.round((hit / total) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Free, always. See the note at the top of this file. */}
        <div className="result-next">
          <h2>{t('nextTitle')}</h2>
          <p>{t(elevated ? 'nextElevated' : 'nextNotElevated')}</p>
          {/* The only thing a context answer changes: one extra line that
              speaks to where the person said it shows up. It adds nothing to
              the score and its absence changes nothing else on this screen. */}
          {setting ? <p className="result-context-note">{t(`settingNote.${setting}`)}</p> : null}
        </div>

        <LeadCapture assessmentId={result.assessmentId} sessionId={sessionId} />

        {elevated ? (
          <div className="result-premium">
            <h2>{t('premiumTitle')}</h2>
            <p className="runner-lead">{t('premiumLead')}</p>
            <ul className="benefits">
              <li>{t('premiumB1')}</li>
              <li>{t('premiumB2')}</li>
              <li>{t('premiumB3')}</li>
              <li>{t('premiumB4')}</li>
            </ul>
            <div className="price">
              {t('premiumPrice')} <small>{t('premiumPriceNote')}</small>
            </div>
            {/* No provider is wired yet, and section 64 says not to pick one
                before the decision is made. Stating that is better than a
                button that pretends to charge. */}
            <button type="button" className="button button-primary" disabled>
              {t('premiumCta')} <ArrowRight size={16} aria-hidden="true" />
            </button>
            <p className="runner-hint">{t('premiumSoon')}</p>
          </div>
        ) : (
          <NextAssessment assessmentId={result.assessmentId} />
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
