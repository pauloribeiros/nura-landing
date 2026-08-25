'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * The paid report's table of contents, with its sections locked.
 *
 * A bullet list of benefits asks the reader to imagine a product. A contents
 * list shows one that already has a shape and a size, which is a stronger
 * reason to pay and a more honest one — it says what is behind the lock rather
 * than how good it is.
 *
 * What may be locked is deliberately constrained. Every section here is
 * interpretive depth: what the patterns mean, how the dimensions combine, how
 * to prepare for a conversation. The recommendation to seek professional
 * assessment is NOT here — it sits in the free result and stays there. Locking
 * the message that someone should get help would be indefensible for a health
 * product, and a section named "points of attention" reads exactly like that
 * even when it is not.
 */

const SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;

export function ReportPreview() {
  const t = useTranslations('report_preview');

  return (
    <div className="report-preview">
      <h2>{t('title')}</h2>
      <p className="runner-lead">{t('lead')}</p>

      <ol className="report-preview-list">
        {SECTIONS.map((key, i) => (
          <li key={key}>
            <span className="report-preview-index">{String(i + 1).padStart(2, '0')}</span>
            <span className="report-preview-name">{t(key)}</span>
            <Lock size={14} aria-hidden="true" className="report-preview-lock" />
          </li>
        ))}
      </ol>
      {/* Announced once for screen readers rather than six times by the icons,
          which are decorative and hidden. */}
      <p className="sr-only">{t('lockedNote', { count: SECTIONS.length })}</p>
    </div>
  );
}
