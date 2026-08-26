/**
 * Grants report access to a session by hand.
 *
 * For testing without paying, and for giving someone a courtesy copy. The
 * grant is marked `source: 'manual'` so it never gets counted as revenue
 * alongside real purchases.
 *
 * Run from apps/web:
 *   node scripts/grant-report.mjs <sessionId>
 *   node scripts/grant-report.mjs --last     grants the most recent scored run
 *   node scripts/grant-report.mjs --list     shows what is already granted
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(import.meta.dirname, '..', '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const arg = process.argv[2];

if (!arg) {
  console.error('uso: node scripts/grant-report.mjs <sessionId> | --last | --list');
  process.exit(1);
}

if (arg === '--list') {
  const { data } = await db
    .from('assessment_entitlements')
    .select('session_id, source, provider, amount_cents, granted_at')
    .order('granted_at', { ascending: false })
    .limit(20);

  console.log(`liberacoes: ${data?.length ?? 0}`);
  for (const e of data ?? []) {
    const valor = e.amount_cents ? `R$ ${(e.amount_cents / 100).toFixed(2)}` : '—';
    console.log(
      `  ${e.session_id.slice(0, 8)}…  ${e.source.padEnd(8)} ${(e.provider ?? '—').padEnd(7)} ${valor.padEnd(10)} ${e.granted_at.slice(0, 19)}`,
    );
  }
  process.exit(0);
}

// Only a scored run can be granted: there would be no report to show.
let sessionId = arg;
if (arg === '--last') {
  const { data } = await db
    .from('assessment_results')
    .select('session_id')
    .order('created_at', { ascending: false })
    .limit(1);
  if (!data?.length) {
    console.error('nenhuma avaliacao pontuada encontrada');
    process.exit(1);
  }
  sessionId = data[0].session_id;
}

const { data: session } = await db
  .from('assessment_sessions')
  .select('id, user_id, assessment_id')
  .eq('id', sessionId)
  .maybeSingle();

if (!session) {
  console.error('sessao nao encontrada:', sessionId);
  process.exit(1);
}

const { data: result } = await db
  .from('assessment_results')
  .select('session_id')
  .eq('session_id', sessionId)
  .maybeSingle();

if (!result) {
  console.error('essa sessao nao foi pontuada — nao ha relatorio para liberar');
  process.exit(1);
}

const { error } = await db.from('assessment_entitlements').insert({
  user_id: session.user_id,
  session_id: session.id,
  assessment_id: session.assessment_id,
  source: 'manual',
});

if (error) {
  if (error.code === '23505') {
    console.log('ja estava liberada:', sessionId);
    process.exit(0);
  }
  console.error('falhou:', error.message);
  process.exit(1);
}

console.log('liberada:', sessionId);
console.log('relatorio: /pt-br/r/' + sessionId);
