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

const FEEDBACK_MS = 4500;

interface LandingActions {
  /** Ad-hoc notice, e.g. the sign-in area that does not exist yet. All real
   *  calls to action are links now, so this is the only remaining use. */
  notify: (message: string) => void;
}

const LandingContext = createContext<LandingActions | null>(null);

export function useLanding(): LandingActions {
  const ctx = useContext(LandingContext);
  if (!ctx) throw new Error('useLanding must be used inside <LandingProvider>');
  return ctx;
}

export function LandingProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string) => {
    setFeedback(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(''), FEEDBACK_MS);
  }, []);

  const actions = useMemo<LandingActions>(() => ({ notify: announce }), [announce]);

  // Section reveal. Kept here so the whole page shares one observer instead of
  // each section registering its own.
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal, .reveal-lines');
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
