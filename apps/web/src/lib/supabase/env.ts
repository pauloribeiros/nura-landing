/**
 * Supabase configuration, read once.
 *
 * Naming follows the current dashboard, which replaced `anon` / `service_role`
 * with `publishable` / `secret`. The publishable key is meant to reach the
 * browser — what protects the data is row level security, not key secrecy.
 * The secret key is a different animal: it bypasses RLS entirely, so it is
 * only read from a server module and is deliberately not exported here.
 *
 * The legacy names are still accepted so a project created before the change
 * keeps working.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

/**
 * Whether the app can talk to Supabase at all.
 *
 * The build must not fail when it is missing: the marketing pages are static
 * and have nothing to do with the database. Only the assessment needs it, and
 * it degrades to local-only storage when this is false.
 */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
