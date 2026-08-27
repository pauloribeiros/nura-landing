'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PublicItem } from '@/domain/iq/bank';
import type { IqSession } from '@/domain/iq/session';
import { IqRunner } from './IqRunner';

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
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState<IqSession | null>(null);

  if (finished) {
    // Checkpoint 4 replaces this with the result screen; scoring happens on
    // the server, so this is where the submit will go.
    return (
      <section className="runner">
        <div className="wrap runner-inner">
          <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
          <h1>{t('computing')}</h1>
          <p className="runner-lead">
            {t('progress', { answered: finished.respostas.length, total: items.length })}
          </p>
        </div>
      </section>
    );
  }

  if (started) {
    return <IqRunner items={items} onFinish={setFinished} />;
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
          <button type="button" className="button button-primary" onClick={() => setStarted(true)}>
            {t('start')} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
