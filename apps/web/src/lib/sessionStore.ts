'use client';

import type { AssessmentSession } from '@/domain/assessment/session';

/**
 * Local persistence for an in-progress assessment.
 *
 * This is a stopgap. Answers about attention, mood and routine are sensitive
 * personal data under the LGPD, and localStorage is readable by any script on
 * the origin and survives until something clears it. The real home is Postgres
 * behind RLS, tied to the anonymous Supabase session — this exists only so a
 * refresh does not cost the person their answers before that is wired.
 *
 * Consequences of that: the record expires on its own, `clear` is part of the
 * interface rather than an afterthought, and nothing here is ever sent
 * anywhere.
 */

const PREFIX = 'nura.session.';
const TTL_MS = 1000 * 60 * 60 * 24 * 7;

interface StoredSession {
  session: AssessmentSession;
  savedAt: number;
}

const keyFor = (assessmentId: string) => `${PREFIX}${assessmentId}`;

export function loadSession(assessmentId: string): AssessmentSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(keyFor(assessmentId));
    if (!raw) return null;

    const stored = JSON.parse(raw) as StoredSession;
    if (!stored?.session || typeof stored.savedAt !== 'number') return null;

    if (Date.now() - stored.savedAt > TTL_MS) {
      clearSession(assessmentId);
      return null;
    }
    return stored.session;
  } catch {
    // Corrupt or unreadable: treat as absent rather than crashing the run.
    return null;
  }
}

export function saveSession(session: AssessmentSession): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredSession = { session, savedAt: Date.now() };
    window.localStorage.setItem(keyFor(session.assessmentId), JSON.stringify(payload));
  } catch {
    // Private mode, quota, or storage disabled. Losing persistence is
    // acceptable; losing the run is not, so this stays silent.
  }
}

export function clearSession(assessmentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyFor(assessmentId));
  } catch {
    /* nothing useful to do */
  }
}
