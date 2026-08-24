import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, supabaseConfigured } from './env';

/**
 * Secret-key client. Bypasses row level security completely.
 *
 * `server-only` at the top makes importing this from a client component a
 * build error rather than a leaked key. Use it for exactly one thing: writing
 * rows the user must not be able to author — today that means assessment
 * results, which are what a paid report is unlocked against (section 59).
 */
export function getSupabaseAdminClient() {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseConfigured || !secretKey) return null;

  return createClient(SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
