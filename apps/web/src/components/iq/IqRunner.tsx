'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PublicItem } from '@/domain/iq/bank';
import { buildRunOrder, type Step } from '@/domain/iq/memoryQueue';
import { interleaveByType } from '@/domain/iq/interleave';
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
import { ConectarPares } from './ConectarPares';
import type { ConfigConectarPares } from '@/domain/iq/itensInterativos';
import { Timer } from './Timer';
import { BREAKS, TransitionScreen } from './TransitionScreen';
import { preloadTransitionArt } from '../TransitionArt';

/**
 * Runs the IQ test.
 *
 * Items arrive as props from the server, already stripped of the answer key —
 * see `publicItems`. Nothing here knows which option is correct, which is why
 * scoring happens on submit rather than as the person goes.
 *
 * CHOOSING AN OPTION ADVANCES. There is no Continue to press on a multiple
 * choice screen: the tap that answers is the tap that moves on. It removes a
 * button, removes the scroll to reach it, and is what the reference products
 * do — one deliberate action per question instead of two.
 *
 * The move is delayed by a beat so the choice is visibly registered first.
 * Advancing on the same frame reads as a mis-tap, and someone who is not sure
 * what they pressed loses confidence in the whole test.
 *
 * Free entry keeps its button, because there is no single keystroke that means
 * "done" — and going back keeps working on reasoning items, where revisiting
 * an answer is a person thinking again. Around a memory item it stays blocked:
 * that would show the stimulus a second time.
 */
export function IqRunner({
  items,
  onFinish,
}: {
  items: PublicItem[];
  onFinish: (session: IqSession) => void;
}) {
  const t = useTranslations('iq');
  // Os rotulos da tela de um item interativo. Separados do enunciado, que mora
  // no banco com o dos outros itens.
  const ti = useTranslations('iq.interativos');

  // The run order is fixed for the whole session: rebuilding it mid-run could
  // move a recall away from the stimulus it belongs to.
  // Types are spread out before the run order is built, so the four
  // odd-one-out items do not arrive as four near-identical screens in a row.
  const steps = useMemo(
    () => buildRunOrder(interleaveByType(items as unknown as Item[])),
    [items],
  );

  const [session, setSession] = useState<IqSession | null>(null);
  const [draft, setDraft] = useState('');
  // Breaks already taken, so returning to a question does not show one twice.
  const [breaksSeen, setBreaksSeen] = useState<number[]>([]);
  // Set while the beat between choosing and moving plays, so a second tap in
  // that window cannot advance twice.
  const advancing = useRef(false);
  const topRef = useRef<HTMLElement>(null);


  // Started on mount rather than on a click: the intro screen belongs to the
  // page, and by the time this renders the person has already begun.
  useEffect(() => {
    setSession(
      createIqSession({ id: randomId(), startedAt: new Date().toISOString(), now: Date.now() }),
    );
    // The first break is twelve questions away; the pictures have until then.
    preloadTransitionArt();
  }, []);

  const step: Step | undefined = session ? steps[session.stepIndex] : undefined;

  // Every screen change returns to the top and takes focus with it — the same
  // reason as the assessment: the next question must not start below the fold.
  //
  // Keyed on the step INDEX alone, deliberately. Depending on `session` ran
  // this on every answer, because recording one produces a new session object:
  // picking an option scrolled the page back to the top mid-question. On a
  // phone, where six figures mean scrolling down to see them, that threw the
  // reader away from what they had just tapped.
  const stepIndex = session?.stepIndex;
  useEffect(() => {
    if (stepIndex === undefined) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    topRef.current?.focus({ preventScroll: true });
    setDraft('');
    advancing.current = false;
  }, [stepIndex]);

  if (!session || !step) return null;

  const item = step.item as unknown as PublicItem;
  const existing = answerFor(session, item.id);
  const isFreeEntry = item.formato_alternativas === 'entrada_livre';
  const isInterativo = item.formato_alternativas === 'interativo';

  // A recall must not be reachable by going back — that would re-show the
  // stimulus that precedes it.
  const previous = steps[session.stepIndex - 1];
  const canGoBack =
    session.stepIndex > 0 && step.kind === 'question' && previous?.kind === 'question';

  const answered = isInterativo
    ? existing?.bruto != null
    : isFreeEntry
      ? (existing?.entradaLivre ?? draft).trim().length > 0
      : existing?.escolhaIndex != null;

  const commit = (partial: {
    escolhaIndex?: number | null;
    entradaLivre?: string;
    bruto?: { dados: unknown };
  }) => {
    setSession((current) =>
      current
        ? recordIqAnswer(current, {
            itemId: item.id,
            escolhaIndex: partial.escolhaIndex ?? null,
            entradaLivre: partial.entradaLivre,
            bruto: partial.bruto,
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

  // Which dimensions the answers so far have touched — the honest version of
  // "you are ahead of 23% of people", and the only comparison the data
  // supports before there is a measured sample.
  const respondidos = new Set(session.respostas.map((r) => r.itemId));
  const dimensoesVistas = [
    ...new Set(items.filter((i) => respondidos.has(i.id)).map((i) => i.dimensao)),
  ];

  // A break is due when the count has just crossed one of the marks and the
  // person is on a question — never between a memory stimulus and its recall,
  // which would sit inside the interference the item depends on.
  const dueBreak =
    step.kind === 'question'
      ? BREAKS.find((b) => answeredCount >= b.after && !breaksSeen.includes(b.after))
      : undefined;

  if (dueBreak) {
    return (
      <section className="runner iq-runner" ref={topRef} tabIndex={-1}>
        <div className="wrap runner-inner">
          <TransitionScreen
            answered={answeredCount}
            total={total}
            variant={dueBreak.variant}
            dimensoes={dimensoesVistas}
            onContinue={() => setBreaksSeen((seen) => [...seen, dueBreak.after])}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="runner iq-runner" ref={topRef} tabIndex={-1}>
      <div className="wrap runner-inner">
        <div className="iq-head">
          {/* Going back lives up here, next to "where am I", instead of in a
              row under the options. Down there it was a 46px button plus its
              margin — 56px of screen spent on the one control almost nobody
              uses, and with the longer questions it was the difference between
              an item fitting the phone and not. */}
          {canGoBack ? (
            <button
              type="button"
              className="iq-back"
              onClick={() => setSession((c) => (c ? goBack(c, Date.now()) : c))}
            >
              <ArrowLeft size={14} aria-hidden="true" /> {t('back')}
            </button>
          ) : null}
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
              seconds: (n) =>
                t.rich('memorySeconds', {
                  n,
                  forte: (chunks) => <strong className="iq-memory-count">{chunks}</strong>,
                }),
              wordHint: t('memoryWordHint'),
              wordNote: t('memoryWordNote'),
            }}
          />
        ) : (
          <>
            <p className="iq-enunciado">{item.enunciado}</p>
            <Stimulus item={item} />

            {isInterativo ? (
              /* Um item que se responde desenhando. Ele avanca sozinho ao
                 concluir — por par completo ou por tempo — porque parar para
                 apertar "continuar" depois de 60 segundos cronometrados so
                 acrescenta um toque a um item que ja terminou. */
              <ConectarPares
                {...(item.interativo as ConfigConectarPares)}
                rotulos={{
                  restante: ti(`${item.id}.restante`),
                  ligadas: ti(`${item.id}.ligadas`),
                  instrucao: ti(`${item.id}.instrucao`),
                  bloqueado: ti(`${item.id}.bloqueado`),
                  concluir: ti(`${item.id}.concluir`),
                  desfazer: ti(`${item.id}.desfazer`),
                }}
                onConcluir={(resultado) => {
                  if (advancing.current) return;
                  advancing.current = true;
                  // So o desenho: quem pontua e o servidor, contra o gabarito
                  // que este navegador nunca teve.
                  commit({ bruto: { dados: resultado } });
                  window.setTimeout(next, 500);
                }}
              />
            ) : isFreeEntry ? (
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
                onChoose={(index) => {
                  if (advancing.current) return;
                  advancing.current = true;
                  commit({ escolhaIndex: index });
                  window.setTimeout(next, 260);
                }}
                letters={['A', 'B', 'C', 'D', 'E', 'F']}
              />
            )}

            {/* Only free entry needs a button — a choice advances on its own,
                and going back moved up to the head. */}
            {isFreeEntry ? (
              <div className="runner-nav runner-nav-end">
                <button type="button" className="button button-primary" onClick={next} disabled={!answered}>
                  {session.stepIndex >= steps.length - 1 ? t('finish') : t('continue')}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
