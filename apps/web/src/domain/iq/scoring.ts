import { DIMENSOES, ITEMS } from './bank';
import { BASE, SPEED, SCORING_VERSION, WEIGHT_BY_DIFFICULTY } from './scoring-config';
import type { Dimensao, Item, Resposta, ScoreDimensao } from './types';

/**
 * Scores a completed run. Pure: same answers always give the same result.
 *
 * WHAT THIS DELIBERATELY DOES NOT PRODUCE is a percentile. A percentile is a
 * position in a distribution, and NURA has no standardisation sample — the
 * normal curve that would be assumed to make one up is an assumption, not a
 * measurement. Telling someone they scored above 78% of people, when nobody
 * has been measured, is a fabricated claim about their mind.
 *
 * The field exists and stays null until there are enough completed runs to
 * compute it from NURA's own takers, at which point the result can say so in
 * those words. See MIN_SAMPLE_FOR_PERCENTILE.
 *
 * `pontos` is NURA's own scale, not an IQ. The result screen never prints
 * "IQ" for the same reason.
 */

export interface IqResult {
  scoringVersion: string;
  pontos: number;
  /** Null until there is a sample to compare against. */
  percentil: number | null;
  tempoTotal_ms: number;
  fatorVelocidade: number;
  acertos: number;
  total: number;
  perfil: ScoreDimensao[];
  pontosFortes: Dimensao[];
  pontosFracos: Dimensao[];
}

/**
 * Whether an answer is right.
 *
 * Free entry compares against the stimulus rather than an option index —
 * spaces are ignored so "4 9 2" and "492" are the same answer, and `inverso`
 * is compared against the reversed sequence.
 */
export function isCorrect(item: Item, resposta: Resposta): boolean {
  const memoria = item.memoria;

  if (memoria && (memoria.cobrar === 'sequencia_completa' || memoria.cobrar === 'inverso')) {
    const given = (resposta.entradaLivre ?? '').replace(/\s+/g, '');
    const expected = memoria.estimulo.replace(/\s+/g, '');
    const target = memoria.cobrar === 'inverso' ? [...expected].reverse().join('') : expected;
    return given.length > 0 && given === target;
  }

  return item.correta !== null && resposta.escolhaIndex === item.correta;
}

/**
 * Time multiplier, clamped and linear between the anchors.
 *
 * Clamped at both ends so an abandoned tab that returns after an hour is not
 * punished beyond the floor, and a run finished implausibly fast earns no more
 * than the ceiling.
 */
export function speedFactor(tempoTotal_ms: number): number {
  const { min, max, neutralMs, fastMs, slowMs } = SPEED;
  if (tempoTotal_ms <= fastMs) return max;
  if (tempoTotal_ms >= slowMs) return min;

  if (tempoTotal_ms < neutralMs) {
    const t = (neutralMs - tempoTotal_ms) / (neutralMs - fastMs);
    return 1 + t * (max - 1);
  }
  const t = (tempoTotal_ms - neutralMs) / (slowMs - neutralMs);
  return 1 - t * (1 - min);
}

export function scoreIq(respostas: Resposta[], items: Item[] = ITEMS): IqResult {
  const byId = new Map(items.map((i) => [i.id, i]));
  const answered = respostas.filter((r) => byId.has(r.itemId));

  let earned = 0;
  let possible = 0;
  let acertos = 0;

  const perDimension = new Map<Dimensao, { acertos: number; total: number }>();
  for (const d of DIMENSOES) perDimension.set(d, { acertos: 0, total: 0 });

  for (const item of items) {
    const weight = WEIGHT_BY_DIFFICULTY[item.dificuldade];
    possible += weight;

    const bucket = perDimension.get(item.dimensao)!;
    bucket.total += 1;

    const resposta = answered.find((r) => r.itemId === item.id);
    if (resposta && isCorrect(item, resposta)) {
      earned += weight;
      acertos += 1;
      bucket.acertos += 1;
    }
  }

  const tempoTotal_ms = answered.reduce((sum, r) => sum + Math.max(0, r.tempo_ms), 0);
  const fatorVelocidade = speedFactor(tempoTotal_ms);

  // The span above BASE is what the weighted total buys. Deliberately not a
  // curve: a straight mapping is honest about being a points total, where an
  // S-curve would imitate the shape of a normalised score without being one.
  const span = 45;
  const ratio = possible === 0 ? 0 : earned / possible;
  const pontos = Math.round((BASE - span / 2 + ratio * span) * fatorVelocidade);

  const perfil: ScoreDimensao[] = DIMENSOES.map((dimensao) => {
    const { acertos: a, total } = perDimension.get(dimensao)!;
    return {
      dimensao,
      acertos: a,
      total,
      percentual: total === 0 ? 0 : Math.round((a / total) * 100),
    };
  });

  // Ties broken by dimension order rather than left to sort stability, so the
  // same run always names the same strengths.
  const ranked = perfil
    .slice()
    .sort((a, b) => b.percentual - a.percentual || DIMENSOES.indexOf(a.dimensao) - DIMENSOES.indexOf(b.dimensao));

  return {
    scoringVersion: SCORING_VERSION,
    pontos,
    percentil: null,
    tempoTotal_ms,
    fatorVelocidade,
    acertos,
    total: items.length,
    perfil,
    pontosFortes: ranked.slice(0, 2).map((p) => p.dimensao),
    pontosFracos: ranked.slice(-2).map((p) => p.dimensao).reverse(),
  };
}
