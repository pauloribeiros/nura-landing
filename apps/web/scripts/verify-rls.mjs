/**
 * Proves the assessment tables isolate one person from another.
 *
 * A policy nobody exercised is a policy nobody knows works, and these tables
 * hold answers about someone's attention and mental health. So this signs in
 * as two separate people and has each one try, through the real API, to read,
 * alter, delete and forge the other's data.
 *
 * The two people are created the way the product creates them: anonymous
 * sign-in. That matters — an anonymous visitor does NOT use the `anon` role,
 * it gets a real uid with the `authenticated` role, and the policies key on
 * that uid. Testing with password users would exercise a path no visitor takes.
 *
 * Both users are deleted at the end.
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
async function person() {
  const client = newClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw new Error(`signInAnonymously: ${error.message}`);
  made.push(data.user.id);
  return { client, id: data.user.id, role: data.user.role, anonymous: data.user.is_anonymous };
}

try {
  const A = await person();
  const B = await person();
  check('duas pessoas anonimas distintas', A.id !== B.id);
  check('visitante anonimo usa role authenticated', A.role === 'authenticated', `role=${A.role}`);
  check('visitante marcado is_anonymous', A.anonymous === true);

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

  // --- leads: escrever pode, ler nao ---
  const { error: leadErr } = await A.client.from('assessment_leads').insert({
    user_id: A.id, session_id: sid, assessment_id: 'attention',
    email: 'a@nura.test', locale: 'pt-br',
  });
  check('A grava o proprio lead', !leadErr, leadErr?.message ?? '');

  const { data: ownLead } = await A.client.from('assessment_leads').select('email');
  check('A le apenas o proprio lead', ownLead?.length === 1, `${ownLead?.length ?? 0} linhas`);

  const { data: otherLead } = await B.client.from('assessment_leads').select('email');
  check('B NAO le lead algum', (otherLead?.length ?? 0) === 0, `${otherLead?.length ?? 0} linhas`);

  const { error: leadSpoof } = await B.client.from('assessment_leads').insert({
    user_id: A.id, assessment_id: 'attention', email: 'spoof@nura.test',
  });
  check('B NAO grava lead no nome de A', !!leadSpoof, leadSpoof?.code ?? 'INSERT PASSOU');

  const { error: upsertErr } = await A.client.from('assessment_leads').upsert(
    { user_id: A.id, session_id: sid, assessment_id: 'attention', email: 'a2@nura.test' },
    { onConflict: 'user_id,assessment_id' },
  );
  check('A reenvia e o lead e atualizado, nao duplicado', !upsertErr, upsertErr?.message ?? '');

  const { data: srvLeads } = await admin.from('assessment_leads')
    .select('email').eq('user_id', A.id);
  check('servidor le o lead', srvLeads?.length === 1, `${srvLeads?.length ?? 0} linhas`);
  check('upsert substituiu o endereco', srvLeads?.[0]?.email === 'a2@nura.test',
    srvLeads?.[0]?.email ?? '');

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
