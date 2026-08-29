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
import { TransitionArt } from '../TransitionArt';
import { useFocusMode } from '@/lib/focusMode';
import { track } from '@/lib/analytics';
import { randomId } from '@/lib/randomId';
import { scoreOnServer } from '@/lib/assessment/scoreOnServer';

type Stage = 'intro' | 'questions' | 'transition' | 'context' | 'done';

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
  choiceLabels: Record<string, string>;
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

export function AssessmentRunner({ definition, prompts, choiceLabels, locale }: Props) {
  const t = useTranslations('runner');
  const pages = useMemo(() => paginate(definition, PAGE_SIZE), [definition]);

  const [stage, setStage] = useState<Stage>('intro');
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [resumable, setResumable] = useState<AssessmentSession | null>(null);
  const [contextIndex, setContextIndex] = useState(0);
  const liveRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  // Set while the beat between choosing and moving plays, so a second tap in
  // that window cannot skip a question.
  const advancing = useRef(false);

  useFocusMode(stage !== 'done');

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
  }, [stage, session?.pageIndex, contextIndex]);

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
          <p className="runner-lead">{t('introLead', { count: definition.questions.length })}</p>

          <ul className="runner-notes">
            <li>{t('noteHonest')}</li>
            <li>{t('noteNoRightAnswer')}</li>
            <li>{t('noteResume')}</li>
          </ul>

          <p className="runner-disclaimer">{t('disclaimer')}</p>

          {resumable ? (
            <div className="runner-resume">
              <p>{t('resumeFound', { answered: resumable.answers.length })}</p>
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
        // The instrument is finished and the result already exists at this
        // point; context is asked in between, and skipping it changes nothing.
        setStage(ASRS_CONTEXT.length > 0 ? 'context' : 'done');
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
          <TransitionArt variant="tdah" />
          <p className="eyebrow eyebrow-light">{t('transitionEyebrow')}</p>
          <h2>{t('transitionTitle')}</h2>
          <p className="runner-lead">{t('transitionLead')}</p>
          <div className="runner-actions">
            <button type="button" className="button button-primary" onClick={() => setStage('questions')}>
              {t('continue')} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (stage === 'context') {
    const question = ASRS_CONTEXT[contextIndex];
    const chosen = answerFor(question.id);

    const leaveContext = () => {
      const answered = ASRS_CONTEXT.filter((q) => answerFor(q.id)).length;
      track('context_completed', { assessment: definition.assessmentId, answered });
      setStage('done');
    };

    const nextContext = () => {
      if (contextIndex < ASRS_CONTEXT.length - 1) setContextIndex(contextIndex + 1);
      else leaveContext();
    };

    return (
      <section className="runner runner-context" ref={topRef} tabIndex={-1}>
        <div className="wrap runner-inner">
          <p className="eyebrow eyebrow-light">{t('contextEyebrow')}</p>
          <h2>{t('contextTitle')}</h2>
          <p className="runner-lead">{t('contextLead')}</p>
          {/* Said plainly rather than buried: these do not touch the score.
              Someone answering them should know they are helping personalise a
              report, not adding to a clinical measure. */}
          <p className="runner-hint">{t('contextNoScore')}</p>

          <p className="runner-progress-label" role="status">
            {t('contextProgress', { step: contextIndex + 1, total: ASRS_CONTEXT.length })}
          </p>

          <fieldset className="runner-question">
            <legend>{t(`ctx.${question.id}.prompt`)}</legend>
            <div className="runner-choices">
              {question.choices.map((choice) => (
                <label
                  key={choice.id}
                  className={`runner-choice ${chosen === choice.id ? 'is-chosen' : ''}`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={choice.id}
                    checked={chosen === choice.id}
                    onChange={() => {
                      if (advancing.current) return;
                      advancing.current = true;
                      choose(question.id, choice.id);
                      window.setTimeout(nextContext, 260);
                    }}
                  />
                  <span>{t(`ctx.${question.id}.${choice.id}`)}</span>
                  {chosen === choice.id ? <Check size={15} aria-hidden="true" /> : null}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="runner-nav">
            {/* Skipping is a real option, presented as one. A courtesy question
                that blocks the result costs more completions than it is worth.
                It is the only button here — answering advances by itself. */}
            <button type="button" className="button button-ghost" onClick={leaveContext}>
              {t('contextSkip')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (stage === 'done') {
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
              {t(stepLabel.block === 'partA' ? 'blockScreening' : 'blockDetail')}
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
                  <div className="runner-choices">
                    {definition.scales[0].choices.map((choice) => (
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
