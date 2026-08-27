'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PublicItem } from '@/domain/iq/bank';
import { buildRunOrder, type Step } from '@/domain/iq/memoryQueue';
import {
  advance,
  answerFor,
  createIqSession,
  goBack,
  recordIqAnswer,
  type IqSession,
} from '@/domain/iq/session';
import type { Item } from '@/domain/iq/types';
import { randomId } from '@/lib/randomId';
import { Stimulus } from './Stimulus';
import { OptionGrid } from './OptionGrid';
import { MemoryShow } from './MemoryShow';
import { FreeEntry } from './FreeEntry';
import { Timer } from './Timer';

/**
 * Runs the IQ test.
 *
 * Items arrive as props from the server, already stripped of the answer key —
 * see `publicItems`. Nothing here knows which option is correct, which is why
 * scoring happens on submit rather than as the person goes.
 *
 * GOING BACK is allowed on reasoning items and blocked around memory ones. On
 * a reasoning item, revisiting an answer is a person thinking again, which is
 * what the test is for. Around a memory item it would show the stimulus a
 * second time, and the item stops measuring memory.
 */
export function IqRunner({
  items,
  onFinish,
}: {
  items: PublicItem[];
  onFinish: (session: IqSession) => void;
}) {
  const t = useTranslations('iq');

  // The run order is fixed for the whole session: rebuilding it mid-run could
  // move a recall away from the stimulus it belongs to.
  const steps = useMemo(() => buildRunOrder(items as unknown as Item[]), [items]);

  const [session, setSession] = useState<IqSession | null>(null);
  const [draft, setDraft] = useState('');
  const topRef = useRef<HTMLElement>(null);

  // Started on mount rather than on a click: the intro screen belongs to the
  // page, and by the time this renders the person has already begun.
  useEffect(() => {
    setSession(
      createIqSession({ id: randomId(), startedAt: new Date().toISOString(), now: Date.now() }),
    );
  }, []);

  const step: Step | undefined = session ? steps[session.stepIndex] : undefined;

  // Every screen change returns to the top and takes focus with it — the same
  // reason as the assessment: the next question must not start below the fold.
  useEffect(() => {
    if (!session) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    topRef.current?.focus({ preventScroll: true });
    setDraft('');
  }, [session?.stepIndex, session]);

  if (!session || !step) return null;

  const item = step.item as unknown as PublicItem;
  const existing = answerFor(session, item.id);
  const isFreeEntry = item.formato_alternativas === 'entrada_livre';

  // A recall must not be reachable by going back — that would re-show the
  // stimulus that precedes it.
  const previous = steps[session.stepIndex - 1];
  const canGoBack =
    session.stepIndex > 0 && step.kind === 'question' && previous?.kind === 'question';

  const answered = isFreeEntry
    ? (existing?.entradaLivre ?? draft).trim().length > 0
    : existing?.escolhaIndex != null;

  const commit = (partial: { escolhaIndex?: number | null; entradaLivre?: string }) => {
    setSession((current) =>
      current
        ? recordIqAnswer(current, {
            itemId: item.id,
            escolhaIndex: partial.escolhaIndex ?? null,
            entradaLivre: partial.entradaLivre,
            // Correctness is the server's to decide; this is a placeholder the
            // scorer overwrites, kept only to satisfy the shared type.
            correta: false,
            tempo_ms: Date.now() - current.stepShownAt,
          })
        : current,
    );
  };

  const next = () => {
    if (isFreeEntry && draft.trim()) commit({ entradaLivre: draft.trim() });

    setSession((current) => {
      if (!current) return current;
      const last = current.stepIndex >= steps.length - 1;
      const moved = advance(current, Date.now());
      if (last) onFinish(moved);
      return moved;
    });
  };

  const answeredCount = session.respostas.length;
  const total = items.length;

  return (
    <section className="runner iq-runner" ref={topRef} tabIndex={-1}>
      <div className="wrap runner-inner">
        <div className="iq-head">
          <p className="runner-progress-label" role="status">
            {t('progress', { answered: answeredCount, total })}
          </p>
          <Timer startedAt={session.startedAt} />
        </div>

        <div className="runner-progress-track" aria-hidden="true">
          <span style={{ width: `${Math.round((answeredCount / total) * 100)}%` }} />
        </div>

        {step.kind === 'memory-show' ? (
          <MemoryShow
            item={item}
            onDone={next}
            copy={{
              hint: t('memoryHint'),
              seconds: (n) => t('memorySeconds', { n }),
              continueLabel: t('continue'),
            }}
          />
        ) : (
          <>
            <p className="iq-enunciado">{item.enunciado}</p>
            <Stimulus item={item} />

            {isFreeEntry ? (
              <FreeEntry
                item={item}
                value={existing?.entradaLivre ?? draft}
                onChange={setDraft}
                copy={{
                  label: t('freeEntryLabel'),
                  placeholder: t('freeEntryPlaceholder'),
                  hint: t('freeEntryHint'),
                }}
              />
            ) : (
              <OptionGrid
                item={item}
                chosen={existing?.escolhaIndex}
                onChoose={(index) => commit({ escolhaIndex: index })}
                letters={['A', 'B', 'C', 'D', 'E', 'F']}
              />
            )}

            <div className="runner-nav">
              {canGoBack ? (
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setSession((c) => (c ? goBack(c, Date.now()) : c))}
                >
                  <ArrowLeft size={16} aria-hidden="true" /> {t('back')}
                </button>
              ) : (
                <span />
              )}
              <button type="button" className="button button-primary" onClick={next} disabled={!answered}>
                {session.stepIndex >= steps.length - 1 ? t('finish') : t('continue')}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>

            {!answered ? <p className="runner-hint">{t('answerToContinue')}</p> : null}
          </>
        )}
      </div>
    </section>
  );
}
