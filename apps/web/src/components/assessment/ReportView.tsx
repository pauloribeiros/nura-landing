import { useTranslations } from 'next-intl';
import type { ReportPlan } from '@/domain/assessment/report';
import {
  DomainStats,
  FrequencyDistribution,
  ItemProfile,
  ScreeningMeter,
  ScreeningStages,
} from './ReportCharts';
import { PrintButton } from './PrintButton';

/**
 * Renders a report plan.
 *
 * A server component: there is nothing interactive except the print button,
 * which is its own client island. Kept out of the client bundle, the report
 * also cannot be reconstructed by anyone who did not receive it from the
 * server.
 *
 * The renderer holds no interpretation of its own. Which words appear is
 * decided by the plan; this file decides only how they are laid out and which
 * figure sits beside which section.
 *
 * Item wording comes from `prompts`, printed exactly as published — the ASRS
 * licence forbids modifying the instrument, and a paraphrase in a paid report
 * would be both a licence breach and a subtly different question.
 */
export function ReportView({
  plan,
  prompts,
  choiceLabels,
}: {
  plan: ReportPlan;
  prompts: Record<string, string>;
  /** The five frequency labels, keyed by choice id. */
  choiceLabels: Record<string, string>;
}) {
  const t = useTranslations('report');
  const titles = useTranslations('report_preview');
  const tr = useTranslations('result_screen');

  // In the instrument's own order, which is the order of increasing frequency.
  const scale = ['never', 'rarely', 'sometimes', 'often', 'very-often'].map(
    (id) => choiceLabels[id] ?? id,
  );

  const byDomain = (domain: string) => plan.responses.filter((r) => r.domain === domain);
  const flaggedIn = (domain: string) => byDomain(domain).filter((r) => r.flagged).length;

  const stages = ['screening', 'assessment', 'diagnosis'].map((k) => ({
    label: t(`stages.${k}.label`),
    body: t(`stages.${k}.body`),
  }));

  return (
    <article className="report">
      <div className="wrap report-inner">
        <header className="report-head">
          {/* Printed too — a document that leaves the site should say whose it
              is, especially one that may be handed to a professional. */}
          <div className="report-brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="report-brand-name">NURA</span>
          </div>
          <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="runner-lead">{t('lead')}</p>
          <PrintButton label={t('print')} />
        </header>

        {plan.sections.map((section, i) => (
          <section key={section.id} className="report-section">
            <h2>
              <span className="report-section-num">{String(i + 1).padStart(2, '0')}</span>
              {titles(section.id)}
            </h2>

            {/* The screening figure belongs beside the section that explains
                the cutoff, not floating at the top with no sentence to anchor
                it. Same reasoning for the others. */}
            {section.id === 's1' ? (
              <ScreeningMeter
                count={plan.screen.count}
                total={plan.screen.total}
                cutoff={plan.screen.cutoff}
                label={t('meterLabel')}
                cutoffLabel={t('meterCutoff', { cutoff: plan.screen.cutoff })}
              />
            ) : null}

            <p>{t(`${section.id}.${section.bodyKey}`, section.params)}</p>

            {section.noteKey ? (
              <p className="report-note">{t(`${section.id}.${section.noteKey}`)}</p>
            ) : null}

            {section.id === 's1' ? (
              <ScreeningStages title={t('stagesTitle')} stages={stages} here={0} />
            ) : null}

            {section.id === 's2' ? (
              <ItemProfile
                responses={byDomain('inattention')}
                prompts={prompts}
                scaleLabels={scale}
                flaggedLabel={t('flaggedLabel')}
              />
            ) : null}

            {section.id === 's3' ? (
              <ItemProfile
                responses={byDomain('hyperactivity')}
                prompts={prompts}
                scaleLabels={scale}
                flaggedLabel={t('flaggedLabel')}
              />
            ) : null}

            {section.id === 's4' ? (
              <>
                <DomainStats
                  ofLabel={t('ofLabel')}
                  domains={[
                    {
                      label: tr('inattention'),
                      flagged: flaggedIn('inattention'),
                      total: byDomain('inattention').length,
                    },
                    {
                      label: tr('hyperactivity'),
                      flagged: flaggedIn('hyperactivity'),
                      total: byDomain('hyperactivity').length,
                    },
                  ]}
                />
                <FrequencyDistribution
                  distribution={plan.distribution}
                  scaleLabels={scale}
                  title={t('distributionTitle')}
                  itemsLabel={t('distributionItems')}
                />
              </>
            ) : null}

            {/* Sections 2 and 3 already show every item with its answer, so
                repeating the flagged ones as a list there would say the same
                thing twice. Section 6 keeps its list: there it is what to take
                to an appointment, which is a different job. */}
            {section.items && section.items.length > 0 && section.id === 's6' ? (
              <>
                <p className="report-items-label">{t('itemsLabel')}</p>
                <ul className="report-items">
                  {section.items.map((id) => (
                    <li key={id}>{prompts[id]}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ))}

        <footer className="report-foot">
          <p className="runner-disclaimer">{t('disclaimer')}</p>
          {/* Printed small, but printed: a report kept for months should say
              which version of the instrument and of the rules produced it. */}
          <p className="report-provenance">
            {plan.version} · {plan.scoringVersion}
          </p>
        </footer>
      </div>
    </article>
  );
}
