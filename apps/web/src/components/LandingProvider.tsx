'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { SECTION_IDS } from '@/content/landing';
import { scrollToId } from './scroll';

const FEEDBACK_MS = 4500;

interface LandingActions {
  /** Primary CTA: send the visitor to the featured assessment. */
  start: () => void;
  /** Secondary CTA on an assessment that is not available yet. */
  showAssessment: (name: string | null) => void;
  /** Ad-hoc notice, e.g. the sign-in area that does not exist yet. */
  notify: (message: string) => void;
}

const LandingContext = createContext<LandingActions | null>(null);

export function useLanding(): LandingActions {
  const ctx = useContext(LandingContext);
  if (!ctx) throw new Error('useLanding must be used inside <LandingProvider>');
  return ctx;
}

export function LandingProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('feedback');
  const [feedback, setFeedback] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string) => {
    setFeedback(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(''), FEEDBACK_MS);
  }, []);

  const actions = useMemo<LandingActions>(
    () => ({
      start: () => {
        scrollToId(SECTION_IDS.featured);
        announce(t('start'));
      },
      showAssessment: (name) => {
        if (name === null) {
          scrollToId(SECTION_IDS.assessments);
          announce(t('comingSoon'));
          return;
        }
        scrollToId(SECTION_IDS.featured);
        announce(t('assessmentReady', { name }));
      },
      notify: announce,
    }),
    [announce, t],
  );

  // Section reveal. Kept here so the whole page shares one observer instead of
  // each section registering its own.
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((el) => el.classList.add('visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible')),
      { threshold: 0.12 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <LandingContext.Provider value={actions}>
      {children}
      {feedback ? (
        <div className="toast" role="status">
          <strong>NURA</strong>
          {feedback}
        </div>
      ) : null}
    </LandingContext.Provider>
  );
}
