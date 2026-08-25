import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { asrs18 } from '@/domain/assessment/instruments/asrs18';
import { scoreAssessment } from '@/domain/assessment/scoring';
import { isContextAnswer } from '@/domain/assessment/context';
import type { AssessmentDefinition } from '@/domain/assessment/types';

/**
 * Scores a finished session, server side, and stores the result.
 *
 * The client already computes a preview so the screen can render instantly.
 * This is the copy that counts: a paid report is unlocked against a row in
 * `assessment_results`, and the client must not be able to author one. The
 * table's RLS makes that structural — `authenticated` has SELECT only, and
 * inserts arrive through the secret key, from here.
 *
 * Two clients are used on purpose, and the distinction is the whole security
 * model of this route:
 *
 *  - the *caller's* client, built from their cookies, answers "whose session
 *    is this?" under RLS. If the session is not theirs, the read returns
 *    nothing and the request 404s. Ownership is never taken from the request
 *    body.
 *  - the *admin* client writes the result, because nobody else may.
 *
 * The answers are re-read from the database rather than accepted from the
 * request. Anything posted by a browser is a claim, not a fact, and scoring a
 * claim would make the stored result exactly as forgeable as the client-side
 * one it exists to replace.
 */

export const runtime = 'nodejs';

const INSTRUMENTS: Record<string, AssessmentDefinition> = {
  [asrs18.assessmentId]: asrs18,
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  if (!supabaseConfigured) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  // Read as the caller, so RLS decides whether this session is theirs.
  const cookieStore = await cookies();
  const asCaller = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // Route handlers may not always be able to write; refreshing the token
      // is not this endpoint's job.
      setAll: () => {},
    },
  });

  const { data: session } = await asCaller
    .from('assessment_sessions')
    .select('id, assessment_id, version, completed_at')
    .eq('id', sessionId)
    .maybeSingle();

  // Not found and not yours are deliberately the same answer: distinguishing
  // them would confirm that a session id exists to someone guessing ids.
  if (!session) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  const definition = INSTRUMENTS[session.assessment_id];
  if (!definition) {
    return NextResponse.json({ error: 'unknown-assessment' }, { status: 400 });
  }

  // A session answered against an older version cannot be scored with today's
  // rules — the questions were not the ones this instrument describes.
  if (session.version !== definition.version) {
    return NextResponse.json({ error: 'version-mismatch' }, { status: 409 });
  }

  const { data: rows } = await asCaller
    .from('assessment_answers')
    .select('question_id, choice_id')
    .eq('session_id', sessionId);

  // Context answers are NURA's, not the instrument's, and must never reach
  // the scorer. The filter is a second line of defence: no rule references
  // them either.
  const answers = (rows ?? [])
    .filter((r) => !isContextAnswer(r.question_id))
    .map((r) => ({ questionId: r.question_id, choiceId: r.choice_id }));

  const answered = new Set(answers.map((a) => a.questionId));
  const missing = definition.questions.filter((q) => !answered.has(q.id));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'incomplete', missing: missing.length },
      { status: 422 },
    );
  }

  let result;
  try {
    result = scoreAssessment(definition, answers);
  } catch (error) {
    // `assertScorable` throws rather than returning a plausible wrong number.
    // Surfacing that as a 500 is right: it means the instrument definition is
    // broken, not the request.
    console.error('[nura] scoring failed', error);
    return NextResponse.json({ error: 'not-scorable' }, { status: 500 });
  }

  const { error: writeError } = await admin.from('assessment_results').upsert(
    {
      session_id: sessionId,
      assessment_id: result.assessmentId,
      version: result.version,
      scoring_version: result.scoringVersion,
      scores: result.scores,
      flags: result.flags,
      flagged: result.flagged,
      bands: result.bands,
      completeness: result.completeness,
    },
    { onConflict: 'session_id' },
  );

  if (writeError) {
    console.error('[nura] could not store result', writeError.message);
    return NextResponse.json({ error: 'store-failed' }, { status: 500 });
  }

  if (!session.completed_at) {
    await admin
      .from('assessment_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  return NextResponse.json({ result });
}
