/**
 * Percentis SIMULADOS — não medidos.
 *
 * Não existe amostra. Estes números saem de uma curva normal escolhida a olho,
 * não de participantes reais, e por isso vivem num arquivo com "simulado" no
 * nome, atrás de um interruptor que vem desligado.
 *
 * O interruptor é `NEXT_PUBLIC_IQ_PERCENTIL_SIMULADO`. Ligado, a tela mostra
 * "mais rápido que X%" como os concorrentes mostram. Desligado — o padrão —
 * nada aparece.
 *
 * O QUE ISSO CUSTA, escrito aqui porque é onde alguém vai ler quando for
 * decidir: com o interruptor ligado em produção, uma pessoa que pagou recebe
 * uma comparação sobre a própria mente que não foi medida. Serve para avaliar
 * o funil; não deveria acompanhar tráfego pago.
 *
 * QUANDO VIRA VERDADE: `MIN_SAMPLE_FOR_PERCENTILE` no scoring-config é o marco
 * — 300 corridas completas. Alcançado ele, o percentil passa a ser calculado
 * da distribuição real e este arquivo sai.
 */

import { BASE } from './scoring-config';

/** Ligado só quando a variável existe e vale "1". */
export const percentilSimuladoLigado = process.env.NEXT_PUBLIC_IQ_PERCENTIL_SIMULADO === '1';

/** Aproximação da normal acumulada, boa o bastante para uma barra na tela. */
function normal(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

const faixa = (n: number) => Math.min(96, Math.max(4, Math.round(n * 100)));

/**
 * Quanto da curva a pontuação deixa para trás.
 *
 * Média 105 e desvio 15 — os mesmos números que uma escala de QI usa, o que
 * torna o resultado plausível e, exatamente por isso, fácil de confundir com
 * uma medida. Não é uma.
 */
export function percentilPorPontos(pontos: number): number {
  return faixa(normal((pontos - BASE) / 15));
}

/**
 * Quanta gente a pessoa teria superado em velocidade.
 *
 * Ancorado no tempo que o teste foi desenhado para levar: 18 minutos no meio
 * da curva, desvio de 6. Terminar em 10 minutos fica alto, em 30 fica baixo.
 */
export function percentilPorTempo(tempoTotal_ms: number): number {
  const minutos = tempoTotal_ms / 60000;
  return faixa(normal((18 - minutos) / 6));
}
