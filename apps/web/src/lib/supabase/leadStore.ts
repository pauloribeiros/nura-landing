'use client';

import { ensureSession, getSupabaseBrowserClient } from './client';

/**
 * Stores an opted-in email address.
 *
 * Unlike the assessment store, this one reports failure honestly instead of
 * degrading quietly. Losing an answer to a dropped request is recoverable —
 * the answers are still on screen and in local storage. Telling someone their
 * address was saved when it was not is a promise broken silently, and there is
 * no local fallback that could ever deliver the email.
 *
 * The upsert replaces a previous address for the same assessment, so
 * correcting a typo works instead of failing on the unique index. RLS scopes
 * every read and write to `auth.uid()`, which is what makes the mailing list
 * impossible to enumerate — a request only ever sees the row it wrote.
 */
export async function saveLead({
  email,
  assessmentId,
  sessionId,
  locale,
}: {
  email: string;
  assessmentId: string;
  sessionId?: string;
  locale?: string;
}): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const auth = await ensureSession();
  if (!supabase || !auth) return false;

  const { error } = await supabase.from('assessment_leads').upsert(
    {
      user_id: auth.user.id,
      session_id: sessionId ?? null,
      assessment_id: assessmentId,
      email,
      locale: locale ?? null,
    },
    { onConflict: 'user_id,assessment_id' },
  );

  if (error) {
    console.warn('[nura] could not save lead', error.message);
    return false;
  }
  return true;
}
