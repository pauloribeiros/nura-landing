'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  createSession,
  goToPage,
  isComplete,
  isPageComplete,
  isResumable,
  paginate,
  progress,
  recordAnswer,
  type AssessmentSession,
  type Page,
} from '@/domain/assessment/session';
import { ASRS_CONTEXT } from '@/domain/assessment/context';
import { scoreAssessment } from '@/domain/assessment/scoring';
import type { AssessmentDefinition } from '@/domain/assessment/types';
import {
  completeSession,
  discardSession,
  loadSession,
  openRemoteSession,
  saveSession,
} from '@/lib/supabase/assessmentStore';
import { AssessmentResult } from './AssessmentResult';
import { Calculating, type PerguntaCarregamento } from '../Calculating';
import { TransitionArt, type ArtVariant } from '../TransitionArt';
import { ScaleCircles } from './ScaleCircles';
import { EspectroResult } from './EspectroResult';
import { useFocusMode } from '@/lib/focusMode';
import { track } from '@/lib/analytics';
import { randomId } from '@/lib/randomId';
import { scoreOnServer } from '@/lib/assessment/scoreOnServer';

type Stage = 'intro' | 'questions' | 'transition' | 'calculating' | 'done';

/**
 * Stages are labelled by position — "step 2 of 3" — and never by theme.
 *
 * A thematic label ("Attention and focus", "Organisation and routine") would
 * read better, but producing it means regrouping items by subject, and the
 * ASRS licence forbids modifying the instrument. `paginate` preserves the
 * published order for exactly that reason and a test locks it. Position gives
 * the same sense of structure and claims nothing about what the items measure.
 *
 * The real domains do get named — on the result screen, where mapping answered
 * items to inattention and hyperactivity is the instrument's own analysis
 * rather than an invented taxonomy.
 */
function stepLabelFor(pages: Page[], pageIndex: number) {
  // Numbered across the whole assessment rather than within the block. Part A
  // is a single page, so per-block numbering produced "step 1 of 1", which
  // tells the person nothing about how far they are. The block still appears,
  // as a qualifier — "Step 1 of 3 · Screening".
  return {
    block: pages[pageIndex].block,
    step: pageIndex + 1,
    total: pages.length,
  };
}

interface Props {
  definition: AssessmentDefinition;
  prompts: Record<string, string>;
  choiceLabels: Record<string, string>;  /**
   * Rotulo de cada bloco, quando o instrumento tem os seus.
   *
   * A ASRS tem dois blocos com nome proprio — triagem e aprofundamento — e o
   * runner sabia disso por dentro. Um instrumento de quatro etapas iguais
   * precisa dos seus, e adivinha-los aqui seria a mesma armadilha do relatorio
   * que servia o questionario errado.
   */
  blockLabels?: Record<string, string>;
  /**
   * O texto de cada pausa, na ordem em que elas acontecem.
   *
   * Sem isto o runner mostra a unica transicao que conhecia, a do TDAH.
   */
  transitions?: { eyebrow: string; title: string; lead: string }[];
  /** Qual ilustracao acompanha cada pausa. */
  transitionArt?: ArtVariant[];
  /**
   * Perguntas feitas por cima da tela de calculo.
   *
   * Nao entram na pontuacao — personalizam uma linha do relatorio. Vinham
   * fixas da ASRS, entao o teste de espectro perguntaria "em qual contexto
   * voce percebe mais dificuldade" com as opcoes do TDAH.
   */
  contextQuestions?: PerguntaCarregamento[];
  /**
   * A abertura, quando o instrumento precisa da sua.
   *
   * A da ASRS fala em atencao, em frequencia e em rastreio — tres coisas que
   * nao valem para uma escala de concordancia sobre tracos do espectro.
   */
  introCopy?: { lead: string; noRightAnswer: string; disclaimer: string };

  locale: string;
}

/**
 * One question per screen.
 *
 * It was six, and six questions with five choices each is about 1700px on a
 * phone: the person scrolls to the bottom, answers, scrolls back to check they
 * did not skip one, then hunts for Continue. One question fits with room to
 * spare, the progress bar moves on every answer instead of every sixth, and
 * the tap that answers is the tap that advances.
 *
 * Pagination is presentation, not modification — the ASRS licence forbids
 * changing the instrument, and `paginate` keeps the published order whatever
 * this number is.
 */
const PAGE_SIZE = 1;

export function AssessmentRunner({
  definition,
  prompts,
  choiceLabels,
  locale,
  blockLabels,
  transitions,
  transitionArt,
  contextQuestions,
  introCopy,
}: Props) {
  const t = useTranslations('runner');
  const pages = useMemo(() => paginate(definition, PAGE_SIZE), [definition]);
  // Uma escala por instrumento, hoje. Lida aqui para a tela nao precisar
  // repetir `definition.scales[0]` em cada ponto onde usa a escala.
  const escala = definition.scales[0];


  const [stage, setStage] = useState<Stage>('intro');
  const [session, setSession] = useState<AssessmentSession | null>(null);

  /**
   * Qual pausa e esta. Contada pelos blocos que ja terminaram antes da pagina
   * atual — assim voltar e avancar de novo mostra a mesma tela, em vez de
   * empurrar a sequencia para a frente a cada ida e volta.
   */
  const pausaAtual = useMemo(
    () => (session ? pages.slice(0, session.pageIndex).filter((p) => p.endsBlock).length : 0),
    [pages, session],
  );
  const [resumable, setResumable] = useState<AssessmentSession | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  // Set while the beat between choosing and moving plays, so a second tap in
  // that window cannot skip a question.
  const advancing = useRef(false);

  useFocusMode(stage === 'done' ? 'off' : stage === 'intro' ? 'reading' : 'answering');

  /**
   * As perguntas de contexto, agora feitas por cima da tela de calculo.
   *
   * Elas nunca entraram na pontuacao — servem para personalizar uma linha do
   * relatorio. Perguntadas aqui, deixam de ser tres telas entre terminar o
   * teste e ver o resultado.
   */
  const perguntasContextoAsrs = useMemo<PerguntaCarregamento[]>(
    () =>
      ASRS_CONTEXT.map((pergunta, i) => ({
        id: pergunta.id,
        texto: t(`ctx.${pergunta.id}.prompt`),
        opcoes: pergunta.choices.map((escolha) => t(`ctx.${pergunta.id}.${escolha.id}`)),
        apos: 2 + i * 2,
      })),
    [t],
  );

  // Advancing a page swaps the questions in place, leaving the viewport where
  // the person left it — halfway down, looking at question 12's choices while
  // question 13 sits above them. Every step change moves back to the top, and
  // takes keyboard focus with it so the same thing happens for anyone not
  // using a mouse.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // `instant`, not `smooth` or `auto`: globals.css sets
    // `html { scroll-behavior: smooth }`, so `auto` would animate too. A step
    // change is a page change — it should land, not glide down a tall page —
    // and jumping does not depend on a scroll animation running at all.
    window.scrollTo({ top: 0, behavior: 'instant' });
    topRef.current?.focus({ preventScroll: true });
    advancing.current = false;
  }, [stage, session?.pageIndex]);

  // Offer to resume before anything else, so a refresh does not silently
  // discard answers the person already gave.
  useEffect(() => {
    let cancelled = false;
    loadSession(definition.assessmentId).then((stored) => {
      if (cancelled) return;
      if (stored && isResumable(definition, stored) && stored.answers.length > 0) {
        setResumable(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [definition]);

  useEffect(() => {
    if (session) void saveSession(session);
  }, [session]);

  const begin = (from?: AssessmentSession) => {
    const resuming = Boolean(from);
    const next =
      from ??
      createSession(definition, {
        id: randomId(),
        startedAt: new Date().toISOString(),
      });
    setSession(next);
    setResumable(null);
    setStage('questions');
    // The anonymous user is created here, on a deliberate click, rather than
    // on page view — which keeps drive-by traffic out of the auth table.
    if (!resuming) void openRemoteSession(next);
    track('assessment_started', { assessment: definition.assessmentId, locale });
  };

  const restart = () => {
    void discardSession(definition.assessmentId, session?.id);
    setResumable(null);
    setSession(null);
    setStage('intro');
  };

  if (stage === 'intro' || !session) {
    return (
      <section className="runner runner-intro">
        <div className="wrap runner-inner">
          <p className="eyebrow eyebrow-light">{t('introEyebrow')}</p>
          <h1>{t('introTitle')}</h1>
          <p className="runner-lead">
            {introCopy?.lead ?? t('introLead', { count: definition.questions.length })}
          </p>

          <ul className="runner-notes">
            <li>{t('noteHonest')}</li>
            <li>{introCopy?.noRightAnswer ?? t('noteNoRightAnswer')}</li>
            <li>{t('noteResume')}</li>
          </ul>

          <p className="runner-disclaimer">{introCopy?.disclaimer ?? t('disclaimer')}</p>

          {resumable ? (
            <div className="runner-resume">
              <p>{t('resumeFound', { answered: resumable.answers.length, total: definition.questions.length })}</p>
              <div className="runner-actions">
                <button type="button" className="button button-primary" onClick={() => begin(resumable)}>
                  {t('resume')} <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button type="button" className="button button-ghost" onClick={restart}>
                  {t('startOver')}
                </button>
              </div>
            </div>
          ) : (
            <div className="runner-actions">
              <button type="button" className="button button-primary" onClick={() => begin()}>
                {t('start')} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  const page = pages[session.pageIndex];
  const stepLabel = stepLabelFor(pages, session.pageIndex);
  const stats = progress(definition, session, pages);
  const answerFor = (questionId: string) =>
    session.answers.find((a) => a.questionId === questionId)?.choiceId;

  const choose = (questionId: string, choiceId: string) => {
    setSession((current) => (current ? recordAnswer(current, { questionId, choiceId }) : current));
  };

  /**
   * Moves on, given the session that already holds the new answer.
   *
   * Takes the session as an argument rather than reading state: the answer
   * that triggers this was recorded microseconds ago, and the render that
   * would tell us the page is complete has not happened yet. Reading `session`
   * here would see the state from before the tap and refuse to move.
   */
  const advanceWith = (current: AssessmentSession) => {
    track('assessment_step_completed', {
      assessment: definition.assessmentId,
      step: current.pageIndex + 1,
    });

    const last = current.pageIndex >= pages.length - 1;
    if (last) {
      if (isComplete(definition, current)) {
        void completeSession(current.id);
        // The screen renders from the local preview; this stores the copy that
        // a paid report is unlocked against, computed from the answers the
        // database actually holds rather than from anything the browser says.
        void scoreOnServer(current.id);
        track('assessment_completed', { assessment: definition.assessmentId });
        // O instrumento acabou e o resultado ja existe. As perguntas de
        // contexto passaram a ser feitas durante o calculo, em vez de num
        // estagio proprio: sao tres telas a menos entre a ultima resposta e o
        // resultado, e elas nunca mexeram na pontuacao.
        setStage('calculating');
      }
      return;
    }
    // A transition screen only where the instrument actually changes block.
    setStage(pages[current.pageIndex].endsBlock ? 'transition' : 'questions');
    setSession(goToPage(current, pages, current.pageIndex + 1));
  };

  /**
   * Answering IS advancing.
   *
   * No Continue to press: one deliberate action per question instead of two,
   * and no button below the fold to reach for. The short delay is so the
   * choice is visibly marked before the screen changes — moving on the same
   * frame reads as a mis-tap, and someone unsure of what they pressed stops
   * trusting the test. Going back still works for the tap that was wrong.
   */
  const chooseAndAdvance = (questionId: string, choiceId: string) => {
    if (advancing.current || !session) return;

    const updated = recordAnswer(session, { questionId, choiceId });
    setSession(updated);
    if (!isPageComplete(page, updated)) return;

    advancing.current = true;
    window.setTimeout(() => advanceWith(updated), 260);
  };

  const back = () => {
    setStage('questions');
    setSession((current) => (current ? goToPage(current, pages, current.pageIndex - 1) : current));
  };

  if (stage === 'transition') {
    return (
      <section className="runner runner-transition" ref={topRef} tabIndex={-1}>
        <div className="wrap runner-inner">
          <TransitionArt
            variant={transitionArt?.[Math.max(0, pausaAtual - 1)] ?? 'tdah'}
          />
          <p className="eyebrow eyebrow-light">
            {transitions?.[Math.max(0, pausaAtual - 1)]?.eyebrow ?? t('transitionEyebrow')}
          </p>
          <h2>{transitions?.[Math.max(0, pausaAtual - 1)]?.title ?? t('transitionTitle')}</h2>
          <p className="runner-lead">
            {transitions?.[Math.max(0, pausaAtual - 1)]?.lead ?? t('transitionLead')}
          </p>
          <div className="runner-actions">
            <button type="button" className="button button-primary" onClick={() => setStage('questions')}>
              {t('continue')} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (stage === 'calculating') {
    return (
      <Calculating
        // O resultado ja existe: foi calculado no navegador a partir das
        // respostas, e gravado no servidor em paralelo. A tela existe para dar
        // corpo ao que acabou de acontecer, nao para esperar por ele.
        pronto
        linhas={[
          t('calc.answers'),
          t('calc.partA'),
          t('calc.partB'),
          t('calc.inattention'),
          t('calc.hyperactivity'),
          t('calc.profile'),
        ]}
        eyebrow={t('calc.eyebrow')}
        titulo={t('calc.title')}
        lead={t('calc.lead')}
        perguntas={contextQuestions ?? perguntasContextoAsrs}
        onResponder={(perguntaId, indice) => {
          const pergunta = ASRS_CONTEXT.find((p) => p.id === perguntaId);
          const escolha = pergunta?.choices[indice];
          if (escolha) choose(perguntaId, escolha.id);
        }}
        onDone={() => {
          track('context_completed', {
            assessment: definition.assessmentId,
            answered: ASRS_CONTEXT.filter((q) => answerFor(q.id)).length,
          });
          setStage('done');
        }}
      />
    );
  }

  if (stage === 'done') {
    /**
     * Cada avaliacao tem a sua tela de resultado. O despacho e explicito pelo
     * mesmo motivo do da rota: um padrao silencioso aqui mostraria desatencao
     * e hiperatividade para quem respondeu sobre sons e rotina.
     */
    if (definition.assessmentId === 'autism') {
      return (
        <EspectroResult
          result={scoreAssessment(definition, session.answers)}
          sessionId={session.id}
          onRestart={restart}
        />
      );
    }

    return (
      <AssessmentResult
        result={scoreAssessment(definition, session.answers)}
        sessionId={session.id}
        contextAnswers={Object.fromEntries(
          ASRS_CONTEXT.map((q) => [q.id, answerFor(q.id)]).filter(([, v]) => v),
        )}
        onRestart={restart}
      />
    );
  }

  return (
    <section className="runner" ref={topRef} tabIndex={-1}>
      <div className="wrap runner-inner">
        <div className="runner-progress">
          <p className="runner-step">
            {t('stepOf', { step: stepLabel.step, total: stepLabel.total })}
            <span className="runner-step-block">
              {blockLabels?.[stepLabel.block] ??
                t(stepLabel.block === 'partA' ? 'blockScreening' : 'blockDetail')}
            </span>
          </p>
          <div className="runner-progress-track" aria-hidden="true">
            <span style={{ width: `${Math.round(stats.ratio * 100)}%` }} />
          </div>
          <p className="runner-progress-label" role="status" ref={liveRef}>
            {t('progress', { answered: stats.answered, total: stats.total })}
          </p>
        </div>

        <ol className="runner-questions">
          {page.questionIds.map((questionId, i) => {
            const chosen = answerFor(questionId);
            const number = session.pageIndex * PAGE_SIZE + i + 1;
            return (
              <li key={questionId} className="runner-question">
                <fieldset>
                  <legend>
                    <span className="runner-question-number">{number}</span>
                    {prompts[questionId]}
                  </legend>
                  {/* A escala decide como se desenha. Uma de concordancia com
                      polos vira regua de circulos; uma de frequencia continua
                      lista, porque "quase sempre" e "sempre" precisam ser
                      lidos para serem distinguidos. */}
                  {escala.presentation === 'circles' && escala.poles ? (
                    <ScaleCircles
                      choices={escala.choices}
                      chosen={chosen}
                      name={questionId}
                      labels={choiceLabels}
                      poles={{
                        low: choiceLabels[escala.poles.low] ?? escala.poles.low,
                        high: choiceLabels[escala.poles.high] ?? escala.poles.high,
                      }}
                      onChoose={(choiceId) => chooseAndAdvance(questionId, choiceId)}
                    />
                  ) : (
                  <div className="runner-choices">
                    {escala.choices.map((choice) => (
                      <label
                        key={choice.id}
                        className={`runner-choice ${chosen === choice.id ? 'is-chosen' : ''}`}
                      >
                        <input
                          type="radio"
                          name={questionId}
                          value={choice.id}
                          checked={chosen === choice.id}
                          onChange={() => chooseAndAdvance(questionId, choice.id)}
                        />
                        <span>{choiceLabels[choice.id]}</span>
                        {chosen === choice.id ? <Check size={15} aria-hidden="true" /> : null}
                      </label>
                    ))}
                  </div>
                  )}
                </fieldset>
              </li>
            );
          })}
        </ol>

        {/* Only a way back. Choosing is what moves forward. */}
        {session.pageIndex > 0 ? (
          <div className="runner-nav">
            <button type="button" className="button button-ghost" onClick={back}>
              <ArrowLeft size={16} aria-hidden="true" /> {t('back')}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
