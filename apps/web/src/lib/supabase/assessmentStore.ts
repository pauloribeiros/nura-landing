'use client';

import type { AssessmentSession } from '@/domain/assessment/session';
import { ensureSession, getSupabaseBrowserClient } from './client';
import {
  clearSession as clearLocal,
  loadSession as loadLocal,
  saveSession as saveLocal,
} from '../sessionStore';

/**
 * Where an in-progress assessment lives.
 *
 * Supabase is the record; local storage is a cache that keeps the run alive
 * when the network or the project is unavailable. Both are written, and reads
 * prefer whichever has more answers — losing answers to a dropped request is a
 * worse failure than a stale local copy.
 *
 * Every write is best-effort on purpose. A person halfway through a
 * questionnaire should never see an error because a row did not save; the
 * answers are still in memory and still in local storage.
 */

interface SessionRow {
  id: string;
  assessment_id: string;
  version: string;
  page_index: number;
  started_at: string;
  completed_at: string | null;
}

function toDomain(row: SessionRow, answers: { question_id: string; choice_id: string }[]): AssessmentSession {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    version: row.version,
    startedAt: row.started_at,
    pageIndex: row.page_index,
    answers: answers.map((a) => ({ questionId: a.question_id, choiceId: a.choice_id })),
  };
}

/** Creates the row for a session that so far only exists in memory. */
export async function openRemoteSession(session: AssessmentSession): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const auth = await ensureSession();
  if (!supabase || !auth) return false;

  const { error } = await supabase.from('assessment_sessions').insert({
    id: session.id,
    user_id: auth.user.id,
    assessment_id: session.assessmentId,
    version: session.version,
    page_index: session.pageIndex,
    started_at: session.startedAt,
  });
  if (error) console.warn('[nura] could not open remote session', error.message);
  return !error;
}

export async function saveSession(session: AssessmentSession): Promise<void> {
  saveLocal(session);

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const auth = await ensureSession();
  if (!auth) return;

  const [{ error: sessionError }, { error: answersError }] = await Promise.all([
    supabase
      .from('assessment_sessions')
      .update({ page_index: session.pageIndex })
      .eq('id', session.id),
    session.answers.length
      ? supabase.from('assessment_answers').upsert(
          session.answers.map((a) => ({
            session_id: session.id,
            question_id: a.questionId,
            choice_id: a.choiceId,
          })),
          { onConflict: 'session_id,question_id' },
        )
      : Promise.resolve({ error: null }),
  ]);

  const failure = sessionError ?? answersError;
  if (failure) console.warn('[nura] could not sync session', failure.message);
}

/** The most complete session available, remote or local. */
export async function loadSession(assessmentId: string): Promise<AssessmentSession | null> {
  const local = loadLocal(assessmentId);

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return local;

  const { data: auth } = await supabase.auth.getSession();
  // No session yet means nothing was ever stored remotely — do not create an
  // anonymous user just to discover that.
  if (!auth.session) return local;

  const { data: rows, error } = await supabase
    .from('assessment_sessions')
    .select('id, assessment_id, version, page_index, started_at, completed_at')
    .eq('assessment_id', assessmentId)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1);

  if (error || !rows?.length) return local;

  const { data: answers } = await supabase
    .from('assessment_answers')
    .select('question_id, choice_id')
    .eq('session_id', rows[0].id);

  const remote = toDomain(rows[0] as SessionRow, answers ?? []);
  if (!local) return remote;
  return remote.answers.length >= local.answers.length ? remote : local;
}

export async function completeSession(sessionId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const { error } = await supabase
    .from('assessment_sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) console.warn('[nura] could not close session', error.message);
}

/**
 * Removes the run entirely, locally and remotely. Answers cascade from the
 * session row, so this is the whole of "delete my data" for an assessment.
 */
export async function discardSession(assessmentId: string, sessionId?: string): Promise<void> {
  clearLocal(assessmentId);

  const supabase = getSupabaseBrowserClient();
  if (!supabase || !sessionId) return;
  const { error } = await supabase.from('assessment_sessions').delete().eq('id', sessionId);
  if (error) console.warn('[nura] could not discard remote session', error.message);
}
