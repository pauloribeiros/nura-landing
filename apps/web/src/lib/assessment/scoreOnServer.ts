'use client';

import type { ScoreResult } from '@/domain/assessment/types';

/**
 * Asks the server to score and store a finished session.
 *
 * Fire-and-forget from the runner's point of view: the screen already shows a
 * preview computed locally, and making someone wait on a round trip to see a
 * result they can already have is a worse experience for no gain in accuracy —
 * both sides run the same pure `scoreAssessment`.
 *
 * What the server call buys is a result the client did not author. That is
 * what a paid report gets unlocked against, so it has to exist before there is
 * anything to sell, and it must not depend on the browser being honest.
 *
 * Returns the stored result when it succeeds, so a caller that wants to
 * reconcile the preview against the record can. Nothing is thrown: a failure
 * here must never take down a result screen the person is already reading.
 */
export async function scoreOnServer(sessionId: string): Promise<ScoreResult | null> {
  try {
    const response = await fetch(`/api/assessment/${sessionId}/score`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    if (!response.ok) {
      console.warn('[nura] server scoring failed', response.status);
      return null;
    }

    const body = (await response.json()) as { result: ScoreResult };
    return body.result;
  } catch (error) {
    console.warn('[nura] server scoring unreachable', error);
    return null;
  }
}
