'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from './env';

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser Supabase client, created once per tab.
 *
 * Returns null when the project is not configured, so the assessment can fall
 * back to local storage instead of crashing. Every call site has to handle
 * that anyway — a person mid-questionnaire should not lose their answers
 * because the database is unreachable.
 */
export function getSupabaseBrowserClient() {
  if (!supabaseConfigured) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}

/**
 * Ensures there is a session, creating an anonymous one if needed.
 *
 * Anonymous sign-in issues a real uid with the `authenticated` role, which is
 * what every RLS policy keys on. Section 27 wants the person to answer before
 * being asked to sign up; this is the mechanism that makes that possible
 * without the rows being ownerless.
 */
export async function ensureSession() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error) {
    // Sign-in can fail for reasons outside our control — anonymous sign-ins
    // disabled, rate limit, network. The run continues locally.
    console.warn('[nura] anonymous sign-in failed, continuing locally', error.message);
    return null;
  }
  return created.session;
}
