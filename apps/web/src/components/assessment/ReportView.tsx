import { useTranslations } from 'next-intl';
import type { ReportPlan } from '@/domain/assessment/report';

/**
 * Renders a report plan.
 *
 * A server component on purpose: there is nothing interactive here, and the
 * report is the one page a person may want to print or hand to a doctor. Kept
 * out of the client bundle it also cannot be reconstructed by anyone who did
 * not receive it from the server.
 *
 * The renderer holds no interpretation of its own. Which words appear is
 * decided by the plan; what this file decides is only how they are laid out.
 * Item wording comes from `prompts`, printed exactly as published — the ASRS
 * licence forbids modifying the instrument, and a paraphrase in a paid report
 * would be both a licence breach and a subtly different question.
 */
export function ReportView({
  plan,
  prompts,
}: {
  plan: ReportPlan;
  prompts: Record<string, string>;
}) {
  const t = useTranslations('report');
  const titles = useTranslations('report_preview');

  return (
    <article className="report">
      <div className="wrap report-inner">
        <header className="report-head">
          <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="runner-lead">{t('lead')}</p>
        </header>

        {plan.sections.map((section, i) => (
          <section key={section.id} className="report-section">
            <h2>
              <span className="report-section-num">{String(i + 1).padStart(2, '0')}</span>
              {titles(section.id)}
            </h2>

            <p>{t(`${section.id}.${section.bodyKey}`, section.params)}</p>

            {section.noteKey ? (
              <p className="report-note">{t(`${section.id}.${section.noteKey}`)}</p>
            ) : null}

            {section.items && section.items.length > 0 ? (
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
