'use client';

import { useState } from 'react';
import { Check, Mail } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { track } from '@/lib/analytics';
import { saveLead } from '@/lib/supabase/leadStore';

/**
 * Optional email capture, placed between the free result and the offer.
 *
 * A one-shot funnel converts or loses someone forever. Contact turns a single
 * event into a conversation, and is usually worth more than any amount of
 * copy tuning on the purchase button.
 *
 * The consent checkbox is separate and unticked by default, and its label says
 * what the address will be used for. Under the LGPD an email tied to
 * mental-health screening answers is sensitive data about an identifiable
 * person: consent has to be specific and freely given, not bundled into
 * "continue". Nothing is sent until both fields are deliberately filled.
 */
export function LeadCapture({
  assessmentId,
  sessionId,
}: {
  assessmentId: string;
  /** Links the address to the run it came from, so a result can be emailed. */
  sessionId?: string;
}) {
  const t = useTranslations('lead');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [consented, setConsented] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  if (state === 'done') {
    return (
      <div className="result-lead is-done">
        <p>
          <Check size={16} aria-hidden="true" /> {t('done')}
        </p>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!consented || !email.trim()) return;

    setState('sending');
    const ok = await saveLead({ email: email.trim(), assessmentId, sessionId, locale });
    if (ok) {
      track('lead_submitted', { assessment: assessmentId, source: 'result' });
      setState('done');
    } else {
      setState('error');
    }
  };

  return (
    <form className="result-lead" onSubmit={submit}>
      <h2>
        <Mail size={18} aria-hidden="true" /> {t('title')}
      </h2>
      <p className="runner-lead">{t('lead')}</p>

      <label className="result-lead-field">
        <span>{t('emailLabel')}</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
        />
      </label>

      <label className="result-lead-consent">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
        />
        <span>{t('consent')}</span>
      </label>

      <button
        type="submit"
        className="button button-secondary"
        disabled={!consented || !email.trim() || state === 'sending'}
      >
        {state === 'sending' ? t('sending') : t('submit')}
      </button>

      {state === 'error' ? <p className="runner-hint">{t('error')}</p> : null}
      <p className="runner-hint">{t('note')}</p>
    </form>
  );
}
