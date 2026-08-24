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
} from '@/domain/assessment/session';
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
import { track } from '@/lib/analytics';
import { randomId } from '@/lib/randomId';

type Stage = 'intro' | 'questions' | 'transition' | 'done';

interface Props {
  definition: AssessmentDefinition;
  prompts: Record<string, string>;
  choiceLabels: Record<string, string>;
  locale: string;
}

const PAGE_SIZE = 6;

export function AssessmentRunner({ definition, prompts, choiceLabels, locale }: Props) {
  const t = useTranslations('runner');
  const pages = useMemo(() => paginate(definition, PAGE_SIZE), [definition]);

  const [stage, setStage] = useState<Stage>('intro');
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [resumable, setResumable] = useState<AssessmentSession | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

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
  const stats = progress(definition, session, pages);
  const pageDone = isPageComplete(page, session);
  const answerFor = (questionId: string) =>
    session.answers.find((a) => a.questionId === questionId)?.choiceId;

  const choose = (questionId: string, choiceId: string) => {
    setSession((current) => (current ? recordAnswer(current, { questionId, choiceId }) : current));
  };

  const advance = () => {
    if (!pageDone) return;
    track('assessment_step_completed', {
      assessment: definition.assessmentId,
      step: session.pageIndex + 1,
    });

    const last = session.pageIndex >= pages.length - 1;
    if (last) {
      if (isComplete(definition, session)) {
        void completeSession(session.id);
        track('assessment_completed', { assessment: definition.assessmentId });
        setStage('done');
      }
      return;
    }
    // A transition screen only where the instrument actually changes block.
    setStage(page.endsBlock ? 'transition' : 'questions');
    setSession((current) => (current ? goToPage(current, pages, current.pageIndex + 1) : current));
  };

  const back = () => {
    setStage('questions');
    setSession((current) => (current ? goToPage(current, pages, current.pageIndex - 1) : current));
  };

  if (stage === 'transition') {
    return (
      <section className="runner runner-transition" ref={topRef} tabIndex={-1}>
        <div className="wrap runner-inner">
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

  if (stage === 'done') {
    return (
      <AssessmentResult
        result={scoreAssessment(definition, session.answers)}
        onRestart={restart}
      />
    );
  }

  return (
    <section className="runner" ref={topRef} tabIndex={-1}>
      <div className="wrap runner-inner">
        <div className="runner-progress">
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
                          onChange={() => choose(questionId, choice.id)}
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

        <div className="runner-nav">
          {session.pageIndex > 0 ? (
            <button type="button" className="button button-ghost" onClick={back}>
              <ArrowLeft size={16} aria-hidden="true" /> {t('back')}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="button button-primary"
            onClick={advance}
            disabled={!pageDone}
          >
            {session.pageIndex >= pages.length - 1 ? t('finish') : t('continue')}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>

        {!pageDone ? <p className="runner-hint">{t('answerAll')}</p> : null}
      </div>
    </section>
  );
}
