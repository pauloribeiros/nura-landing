import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { buildReportPlan, type ReportPlan } from '@/domain/assessment/report';
import { isContextAnswer } from '@/domain/assessment/context';
import type { ScoreResult } from '@/domain/assessment/types';

/**
 * Loads the report for a session, if it belongs to whoever is asking.
 *
 * Ownership is decided by row level security, not by a check written here.
 * The read runs as the caller, built from their cookies, so a session that is
 * not theirs simply returns nothing — the same answer as a session that does
 * not exist. Returning `null` for both is deliberate: distinguishing them
 * would confirm to someone guessing ids that a given session is real.
 *
 * The result comes from `assessment_results`, the row the SERVER wrote after
 * scoring. Rebuilding it from the answers here would work and would be wrong:
 * the stored row is what a purchase is made against, and a report generated
 * from a different computation could disagree with it.
 */
export async function loadReport(sessionId: string): Promise<ReportPlan | null> {
  if (!supabaseConfigured) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // A page render may not write cookies; refreshing the token is not this
      // function's job.
      setAll: () => {},
    },
  });

  const { data: stored } = await supabase
    .from('assessment_results')
    .select('assessment_id, version, scoring_version, scores, flags, flagged, bands, completeness')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!stored) return null;

  const result: ScoreResult = {
    assessmentId: stored.assessment_id,
    version: stored.version,
    scoringVersion: stored.scoring_version,
    scores: stored.scores as Record<string, number>,
    flags: stored.flags as Record<string, boolean>,
    flagged: stored.flagged as Record<string, string[]>,
    bands: stored.bands as Record<string, string>,
    completeness: Number(stored.completeness),
  };

  // Context answers personalise the wording. Their absence is normal — they
  // are optional — so a failure to read them must not fail the report.
  const { data: answers } = await supabase
    .from('assessment_answers')
    .select('question_id, choice_id')
    .eq('session_id', sessionId);

  const context = Object.fromEntries(
    (answers ?? [])
      .filter((a) => isContextAnswer(a.question_id))
      .map((a) => [a.question_id, a.choice_id]),
  );

  return buildReportPlan(result, context);
}
