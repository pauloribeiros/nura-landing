'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { PublicItem } from '@/domain/iq/bank';
import type { IqResult as IqResultData } from '@/domain/iq/scoring';
import type { IqSession } from '@/domain/iq/session';
import { IqRunner } from './IqRunner';
import { useFocusMode } from '@/lib/focusMode';
import { IqResult } from './IqResult';
import { ensureSession } from '@/lib/supabase/client';

/**
 * The screen before the test, and the one that owns the run.
 *
 * The intro exists to set expectations that change the measurement: how long
 * it takes, that some questions hide their stimulus, and that looking things
 * up makes the result meaningless. A timed reasoning test where the person did
 * not know they were being timed measures something else.
 *
 * The disclaimer is not decoration either. This produces a points total on
 * NURA's own scale, not an IQ — an IQ is a normalised position in a
 * standardisation sample, and none exists here. The screen says so before
 * anyone spends twenty minutes.
 */
export function IqIntro({ items }: { items: PublicItem[] }) {
  const t = useTranslations('iq');
  const locale = useLocale();
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<'idle' | 'scoring' | 'error'>('idle');
  const [result, setResult] = useState<IqResultData | null>(null);

  // Focus mode from the moment the page opens until the result exists — the
  // intro included. Owned here rather than in the runner because this
  // component is the one that lives through every stage; two owners adding and
  // removing the same class would fight when one of them unmounted.
  useFocusMode(result ? 'off' : started ? 'answering' : 'reading');

  /**
   * Sends the run to be scored.
   *
   * The browser cannot do this itself — it never had the answer key. A failure
   * here is shown rather than swallowed: unlike a sync that can be retried
   * later, there is nothing to fall back to, and someone who spent twenty
   * minutes deserves to know the result did not arrive.
   */
  const submit = async (session: IqSession) => {
    setState('scoring');
    try {
      const response = await fetch('/api/iq/score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ respostas: session.respostas, locale }),
      });
      if (!response.ok) {
        setState('error');
        return;
      }
      const body = (await response.json()) as { result: IqResultData };
      setResult(body.result);
      setState('idle');
    } catch {
      setState('error');
    }
  };

  /**
   * Signs in anonymously before the run, not after it.
   *
   * The score route needs a session to own the result. Creating it at submit
   * would be tidier — only finished runs would make a user — but it moves the
   * one step that can fail to the end, where failing costs someone twenty
   * minutes of work with nothing to show. Failing here costs a click.
   *
   * An abandoned run still leaves no assessment rows: the session and the
   * result are written by the server, at submit.
   */
  const begin = () => {
    void ensureSession();
    setStarted(true);
  };

  const restart = () => {
    setResult(null);
    setState('idle');
    setStarted(false);
  };

  if (result) return <IqResult result={result} onRestart={restart} />;

  if (state === 'scoring' || state === 'error') {
    return (
      <section className="runner">
        <div className="wrap runner-inner">
          <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
          <h1>{state === 'error' ? t('scoreFailedTitle') : t('computing')}</h1>
          {state === 'error' ? <p className="runner-lead">{t('scoreFailedBody')}</p> : null}
        </div>
      </section>
    );
  }

  if (started) {
    return <IqRunner items={items} onFinish={submit} />;
  }

  return (
    <section className="runner runner-intro">
      <div className="wrap runner-inner">
        <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
        <h1>{t('title')}</h1>
        <p className="runner-lead">{t('lead')}</p>

        <ul className="runner-notes">
          <li>{t('note1')}</li>
          <li>{t('note2')}</li>
          <li>{t('note3')}</li>
        </ul>

        <p className="runner-disclaimer">{t('disclaimer')}</p>

        <div className="runner-actions">
          <button type="button" className="button button-primary" onClick={begin}>
            {t('start')} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
