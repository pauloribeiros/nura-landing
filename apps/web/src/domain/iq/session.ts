import type { Resposta } from './types';

/**
 * A run of the IQ test.
 *
 * Anonymous by construction, and pure: `id` and `startedAt` are injected so
 * every function here stays deterministic and testable, the same way the
 * assessment session works.
 *
 * The clock is stored as a start timestamp rather than an accumulating count.
 * A counter drifts when a tab is backgrounded and the browser throttles
 * timers; the difference between two timestamps does not.
 */
export interface IqSession {
  id: string;
  startedAt: string;
  /** Index into the run order, not into the item bank. */
  stepIndex: number;
  respostas: Resposta[];
  /** When the current screen appeared, for per-item timing. */
  stepShownAt: number;
}

export function createIqSession({
  id,
  startedAt,
  now,
}: {
  id: string;
  startedAt: string;
  now: number;
}): IqSession {
  return { id, startedAt, stepIndex: 0, respostas: [], stepShownAt: now };
}

/** Replaces any previous answer for the same item. Returns a new session. */
export function recordIqAnswer(session: IqSession, resposta: Resposta): IqSession {
  const respostas = session.respostas.filter((r) => r.itemId !== resposta.itemId);
  return { ...session, respostas: [...respostas, resposta] };
}

export function advance(session: IqSession, now: number): IqSession {
  return { ...session, stepIndex: session.stepIndex + 1, stepShownAt: now };
}

export function goBack(session: IqSession, now: number): IqSession {
  return { ...session, stepIndex: Math.max(0, session.stepIndex - 1), stepShownAt: now };
}

export const answerFor = (session: IqSession, itemId: string) =>
  session.respostas.find((r) => r.itemId === itemId);

/** Elapsed run time. Read from timestamps, never accumulated. */
export const elapsedMs = (session: IqSession, now: number) =>
  Math.max(0, now - new Date(session.startedAt).getTime());
