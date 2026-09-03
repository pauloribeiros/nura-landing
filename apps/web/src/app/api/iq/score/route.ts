import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { ITEMS } from '@/domain/iq/bank';
import { scoreIq } from '@/domain/iq/scoring';
import { SCORING_VERSION } from '@/domain/iq/scoring-config';
import { lerDesenhoDoCliente } from '@/domain/iq/conectarPares';
import type { Resposta } from '@/domain/iq/types';

/**
 * Scores a finished IQ run and stores the result.
 *
 * The browser never had the answer key — `publicItems` strips it — so this is
 * the only place the run can be scored at all. What arrives is what the person
 * chose; what decides whether a choice was right is here, against the bank.
 *
 * EVERY NUMBER THAT FEEDS THE SCORE IS RE-DERIVED OR CLAMPED. Correctness is
 * recomputed, never read from the payload: `Resposta.correta` arrives as
 * whatever the browser felt like sending and is discarded. Per-item time is
 * clamped, because a client that reports two milliseconds per item would earn
 * the full speed bonus for free.
 *
 * The session row is created here rather than at the start of the run. An IQ
 * run has nothing to resume — leaving halfway through means starting again —
 * so a row per opened tab would be rows for runs that never happened.
 */

export const runtime = 'nodejs';

/** Longer than this and the person was not at the screen. */
const MAX_ITEM_MS = 5 * 60 * 1000;
/** Shorter than this and nobody read the question, let alone answered it. */
const MIN_ITEM_MS = 250;

interface Body {
  respostas?: unknown;
  locale?: string;
}

/** Accepts only what the scorer needs, in the shape it needs. */
function parseAnswers(input: unknown): Resposta[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length === 0 || input.length > ITEMS.length) return null;

  const known = new Set(ITEMS.map((i) => i.id));
  const seen = new Set<string>();
  const out: Resposta[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;

    const itemId = typeof r.itemId === 'string' ? r.itemId : null;
    // An unknown id is not a mistake to tolerate — it means the payload was
    // built against a different bank, and scoring it would be meaningless.
    if (!itemId || !known.has(itemId) || seen.has(itemId)) return null;
    seen.add(itemId);

    const escolhaIndex =
      typeof r.escolhaIndex === 'number' && Number.isInteger(r.escolhaIndex) ? r.escolhaIndex : null;
    const entradaLivre = typeof r.entradaLivre === 'string' ? r.entradaLivre.slice(0, 64) : undefined;

    const rawTime = typeof r.tempo_ms === 'number' && Number.isFinite(r.tempo_ms) ? r.tempo_ms : 0;

    // O item que se responde desenhando nao tem indice nem texto: o que ele
    // manda e o tracado. Passa por `lerDesenhoDoCliente` porque nada aqui pode
    // ser lido como veio — o desenho e limitado em tamanho, e os acertos que o
    // navegador afirma ter feito sao descartados e recontados no scorer.
    const desenho = r.bruto ? lerDesenhoDoCliente((r.bruto as Record<string, unknown>).dados) : null;
    if (r.bruto && !desenho) {
      console.warn('[nura] desenho descartado por forma invalida', itemId);
    }

    out.push({
      itemId,
      escolhaIndex,
      entradaLivre,
      bruto: desenho ? { dados: desenho } : undefined,
      // Overwritten by the scorer. Kept only to satisfy the shared type.
      correta: false,
      tempo_ms: Math.min(MAX_ITEM_MS, Math.max(MIN_ITEM_MS, rawTime)),
    });
  }

  return out;
}

export async function POST(request: Request) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const respostas = parseAnswers(body.respostas);
  if (!respostas) return NextResponse.json({ error: 'bad-request' }, { status: 400 });

  const cookieStore = await cookies();
  const asCaller = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });

  const { data: auth } = await asCaller.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'no-session' }, { status: 401 });

  const result = scoreIq(respostas, ITEMS);

  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'not-configured' }, { status: 503 });

  // Owned by the caller, written by the server. The insert names `user_id`
  // explicitly so the row belongs to the person who answered, not to whoever
  // the service key happens to be.
  const { data: session, error: sessionError } = await admin
    .from('assessment_sessions')
    .insert({
      user_id: auth.user.id,
      assessment_id: 'cognition',
      version: SCORING_VERSION,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    console.error('[nura] could not open iq session', sessionError?.message);
    return NextResponse.json({ error: 'store-failed' }, { status: 500 });
  }

  // Answers are stored for audit and for a future recalibration: when the
  // coefficients change, every past run can be rescored from what was actually
  // chosen. `choice_id` carries the index as text for options and the typed
  // string for free entry, which is the whole of what a person answered.
  // O item interativo nao tem escolha nem texto para gravar aqui; o que ele
  // produziu — score bruto, tempo, bloqueios e o tracado — vai no `payload` do
  // resultado, que e jsonb. Esta coluna guarda so o score, para que uma leitura
  // rapida da tabela nao precise abrir o payload.
  const brutoPorItem = new Map(
    (result.interativos ?? []).map((i) => [i.itemId, i.score] as const),
  );

  const rows = respostas.map((r) => ({
    session_id: session.id,
    question_id: r.itemId,
    choice_id: brutoPorItem.has(r.itemId)
      ? `bruto:${brutoPorItem.get(r.itemId)}`
      : (r.entradaLivre ?? String(r.escolhaIndex ?? '')),
  }));

  const { error: answersError } = await admin.from('assessment_answers').insert(rows);
  if (answersError) {
    console.error('[nura] could not store iq answers', answersError.message);
    // Not fatal: the result is what the report is built from, and losing the
    // raw answers costs a future rescore, not this person's result.
  }

  const { error: resultError } = await admin.from('assessment_results').insert({
    session_id: session.id,
    assessment_id: 'cognition',
    version: SCORING_VERSION,
    scoring_version: result.scoringVersion,
    // The shared columns hold what they can; the rest is in `payload`.
    scores: { pontos: result.pontos, acertos: result.acertos, total: result.total },
    flags: {},
    flagged: {},
    bands: {},
    completeness: respostas.length / ITEMS.length,
    payload: result,
  });

  if (resultError) {
    console.error('[nura] could not store iq result', resultError.message);
    return NextResponse.json({ error: 'store-failed' }, { status: 500 });
  }

  return NextResponse.json({ sessionId: session.id, result });
}
