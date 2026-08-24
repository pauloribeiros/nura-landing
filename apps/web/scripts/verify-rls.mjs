/**
 * Proves the assessment tables isolate one person from another.
 *
 * A policy nobody exercised is a policy nobody knows works, and these tables
 * hold answers about someone's attention and mental health. So this signs in
 * as two separate people and has each one try, through the real API, to read,
 * alter, delete and forge the other's data.
 *
 * Test users are created through the admin API and deleted at the end.
 * Run from apps/web with: node scripts/verify-rls.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.join(import.meta.dirname, '..', '.env.local');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const newClient = () => createClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });

let failures = 0;
const check = (label, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`${pass ? 'PASSA' : 'FALHA'}  ${label}${detail ? '  (' + detail + ')' : ''}`);
};

const made = [];
async function person(tag) {
  const email = `rls-${tag}-${crypto.randomUUID()}@nura.test`;
  const password = crypto.randomUUID() + 'Aa1!';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  made.push(data.user.id);
  const client = newClient();
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw new Error(`signIn: ${e2.message}`);
  return { client, id: s.user.id, role: s.user.role };
}

try {
  const A = await person('a');
  const B = await person('b');
  check('duas pessoas distintas', A.id !== B.id);
  check('sessao usa role authenticated', A.role === 'authenticated', `role=${A.role}`);

  const sid = crypto.randomUUID();
  const { error: insErr } = await A.client.from('assessment_sessions')
    .insert({ id: sid, user_id: A.id, assessment_id: 'attention', version: 'asrs-v1.1' });
  check('A grava a propria sessao', !insErr, insErr?.message ?? '');

  const { error: ansErr } = await A.client.from('assessment_answers')
    .insert({ session_id: sid, question_id: 'q1', choice_id: 'often' });
  check('A grava resposta na propria sessao', !ansErr, ansErr?.message ?? '');

  const { data: mine } = await A.client.from('assessment_sessions').select('id').eq('id', sid);
  check('A le a propria sessao', mine?.length === 1);

  const { data: theirs } = await B.client.from('assessment_sessions').select('id').eq('id', sid);
  check('B NAO enxerga a sessao de A', (theirs?.length ?? 0) === 0, `${theirs?.length ?? 0} linhas`);

  const { data: allS } = await B.client.from('assessment_sessions').select('id');
  check('B NAO enxerga sessao alheia alguma', (allS?.length ?? 0) === 0, `${allS?.length ?? 0} linhas`);

  const { data: theirAns } = await B.client.from('assessment_answers').select('question_id').eq('session_id', sid);
  check('B NAO enxerga as respostas de A', (theirAns?.length ?? 0) === 0, `${theirAns?.length ?? 0} linhas`);

  await B.client.from('assessment_sessions').delete().eq('id', sid);
  const { data: still } = await A.client.from('assessment_sessions').select('id').eq('id', sid);
  check('B NAO apaga a sessao de A', still?.length === 1);

  await B.client.from('assessment_sessions').update({ page_index: 99 }).eq('id', sid);
  const { data: untouched } = await A.client.from('assessment_sessions').select('page_index').eq('id', sid);
  check('B NAO altera a sessao de A', untouched?.[0]?.page_index === 0, `page_index=${untouched?.[0]?.page_index}`);

  const { error: spoof } = await B.client.from('assessment_sessions')
    .insert({ id: crypto.randomUUID(), user_id: A.id, assessment_id: 'attention', version: 'asrs-v1.1' });
  check('B NAO grava sessao no nome de A', !!spoof, spoof?.code ?? 'INSERT PASSOU');

  const { error: ansSpoof } = await B.client.from('assessment_answers')
    .insert({ session_id: sid, question_id: 'q2', choice_id: 'often' });
  check('B NAO grava resposta na sessao de A', !!ansSpoof, ansSpoof?.code ?? 'INSERT PASSOU');

  const result = {
    session_id: sid, assessment_id: 'attention', version: 'asrs-v1.1',
    scoring_version: 'x', scores: {}, flags: {}, flagged: {}, bands: {}, completeness: 1,
  };
  const { error: resErr } = await A.client.from('assessment_results').insert(result);
  check('cliente NAO escreve resultado', !!resErr, resErr?.code ?? 'INSERT PASSOU');

  const { error: srvErr } = await admin.from('assessment_results').insert(result);
  check('servidor escreve resultado', !srvErr, srvErr?.message ?? '');
  const { data: ownRes } = await A.client.from('assessment_results').select('id').eq('session_id', sid);
  check('A le o proprio resultado', ownRes?.length === 1);
  const { data: otherRes } = await B.client.from('assessment_results').select('id').eq('session_id', sid);
  check('B NAO le o resultado de A', (otherRes?.length ?? 0) === 0, `${otherRes?.length ?? 0} linhas`);

  const { data: nada } = await newClient().from('assessment_sessions').select('id');
  check('requisicao sem login nao le nada', (nada?.length ?? 0) === 0, `${nada?.length ?? 0} linhas`);

  await A.client.from('assessment_sessions').delete().eq('id', sid);
  const { data: gone } = await A.client.from('assessment_sessions').select('id').eq('id', sid);
  check('A apaga a propria sessao', (gone?.length ?? 0) === 0);
  const { data: casc } = await admin.from('assessment_answers').select('question_id').eq('session_id', sid);
  check('respostas somem em cascata', (casc?.length ?? 0) === 0, `${casc?.length ?? 0} linhas`);
} finally {
  for (const id of made) await admin.auth.admin.deleteUser(id);
  console.log(`\nusuarios de teste removidos: ${made.length}`);
}

console.log(failures ? `${failures} verificacao(oes) FALHARAM` : 'todas as verificacoes passaram');
process.exit(failures ? 1 : 0);
