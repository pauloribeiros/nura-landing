import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { buildIqReportPlan, type IqReportPlan } from '@/domain/iq/report';
import type { IqResult } from '@/domain/iq/scoring';
import { buildReportPlan, type ReportPlan } from '@/domain/assessment/report';
import { isContextAnswer } from '@/domain/assessment/context';
import { asrs18 } from '@/domain/assessment/instruments/asrs18';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
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
 *
 * Access is gated on an entitlement row. The check is a read, not a written
 * rule: `assessment_entitlements` grants the browser SELECT and nothing else,
 * so a row can only have come from the server after a provider confirmed
 * payment. Someone without one gets the same `null` as someone asking about a
 * session that is not theirs.
 *
 * A token opens the same door from a different device. The cookie proves the
 * browser that bought; the token proves possession of the emailed link, which
 * is how a person reaches their report from a phone or after clearing the
 * browser. It is checked with the admin client because the caller has no
 * session to check it against — but it grants exactly one report, the one it
 * belongs to, and a revoked one grants nothing.
 */
/**
 * O que uma sessao paga devolve, ja separado por avaliacao.
 *
 * Discriminado de proposito: quem consome precisa escolher a view, e um tipo
 * unico permitiria passar o plano errado sem o compilador reclamar — que e
 * exatamente o que acontecia.
 */
export type RelatorioCarregado =
  | { kind: 'asrs'; plan: ReportPlan }
  | { kind: 'iq'; plan: IqReportPlan };

export async function loadReport(
  sessionId: string,
  accessToken?: string,
): Promise<RelatorioCarregado | null> {
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

  // Gate first: no reason to read a result the caller may not see.
  let entitled = false;

  const { data: entitlement } = await supabase
    .from('assessment_entitlements')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (entitlement) entitled = true;

  if (!entitled && accessToken) {
    const admin = getSupabaseAdminClient();
    if (admin) {
      // Matched on BOTH the token and the session: a valid token for one
      // report must not open another named in the URL.
      const { data: byToken } = await admin
        .from('assessment_entitlements')
        .select('id, revoked_at')
        .eq('session_id', sessionId)
        .eq('access_token', accessToken)
        .maybeSingle();

      if (byToken && !byToken.revoked_at) entitled = true;
    }
  }

  if (!entitled) return null;

  // With a token there is no caller session, so the reads that follow must not
  // depend on one. The gate above already decided access.
  const reader = entitlement ? supabase : (getSupabaseAdminClient() ?? supabase);

  const { data: stored } = await reader
    .from('assessment_results')
    .select('assessment_id, version, scoring_version, scores, flags, flagged, bands, completeness, payload')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!stored) return null;

  /**
   * O RACIOCINIO NAO PASSA PELO PLANO DA ASRS.
   *
   * O relatorio de TDAH monta `ReportPlan` a partir das colunas compartilhadas
   * e dos itens respondidos. O de raciocinio tem outra forma: o resultado
   * inteiro foi gravado em `payload` na hora da pontuacao, e o plano dele sai
   * dai. Rotea-los pelo mesmo construtor foi o que produziu, ate hoje, um
   * relatorio de QI com os enunciados da ASRS dentro.
   */
  if (stored.assessment_id === 'cognition') {
    const bruto = stored.payload as IqResult | null;
    if (!bruto) return null;
    return { kind: 'iq', plan: buildIqReportPlan(bruto) };
  }

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
  const { data: answers } = await reader
    .from('assessment_answers')
    .select('question_id, choice_id')
    .eq('session_id', sessionId);

  const context = Object.fromEntries(
    (answers ?? [])
      .filter((a) => isContextAnswer(a.question_id))
      .map((a) => [a.question_id, a.choice_id]),
  );

  // The figures need the frequency chosen for each item, not only which ones
  // cleared their threshold. Choice ids are turned into the instrument's own
  // 0-4 values here rather than stored as numbers, so the scale stays the
  // instrument's business.
  const valueOf = new Map(asrs18.scales[0].choices.map((c) => [c.id, c.value]));
  const itemValues = Object.fromEntries(
    (answers ?? [])
      .filter((a) => !isContextAnswer(a.question_id))
      .map((a) => [a.question_id, valueOf.get(a.choice_id) ?? 0]),
  );

  return { kind: 'asrs', plan: buildReportPlan(result, context, itemValues) };
}

/**
 * Qual avaliacao uma sessao respondeu.
 *
 * Serve ao titulo da aba do relatorio, que precisa escolher entre dois
 * catalogos antes de qualquer portao rodar. Nao revela conteudo — devolve so o
 * nome da avaliacao, e null para um id que nao existe. O portao de acesso
 * continua sendo `loadReport`, que decide se a pagina abre.
 */
export async function assessmentOfSession(sessionId: string): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from('assessment_sessions')
    .select('assessment_id')
    .eq('id', sessionId)
    .maybeSingle();

  return data?.assessment_id ?? null;
}
