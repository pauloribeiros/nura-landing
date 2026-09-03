import { describe, expect, it } from 'vitest';
import { ITEMS } from './bank';
import { SOLUCOES, type ConfigConectarPares } from './itensInterativos';
import { isCorrect, scoreIq, speedFactor } from './scoring';
import { SPEED } from './scoring-config';
import type { Resposta } from './types';

/**
 * The scorer is what a paid report is built on, so the things pinned here are
 * the ones that would be wrong quietly: a free-entry answer compared the wrong
 * way, a speed bonus large enough to beat accuracy, or a percentile appearing
 * where no sample exists.
 */

const answerAll = (correct: boolean): Resposta[] =>
  ITEMS.map((item) => {
    /**
     * Item interativo: a "resposta certa" e um desenho, e o servidor a refaz a
     * partir das ligacoes. Ligar em linha reta cada par previsto e a solucao
     * mais simples que passa — os pontos foram posicionados para que ela nao
     * gere cruzamento.
     */
    if (item.formato_alternativas === 'interativo') {
      const config = item.interativo as ConfigConectarPares;
      // Ligar em linha reta NAO resolve este item — o traco rosa atravessa o
      // azul. A solucao declarada contorna, que e o que se pede.
      const ligacoes = correct
        ? SOLUCOES[item.id].map((l) => ({ ...l, correta: true }))
        : [];
      return {
        itemId: item.id,
        escolhaIndex: null,
        correta: correct,
        tempo_ms: 20_000,
        bruto: {
          dados: {
            motivo: 'completou',
            tempoGasto: 20_000,
            acertos: correct ? config.paresCorretos.length : 0,
            erros: correct ? 0 : 1,
            faltantes: correct ? 0 : config.paresCorretos.length,
            bloqueios: 0,
            ligacoes,
          },
        },
      };
    }

    const memoria = item.memoria;
    if (memoria && (memoria.cobrar === 'sequencia_completa' || memoria.cobrar === 'inverso')) {
      const expected = memoria.estimulo.replace(/\s+/g, '');
      const target = memoria.cobrar === 'inverso' ? [...expected].reverse().join('') : expected;
      return {
        itemId: item.id,
        escolhaIndex: null,
        entradaLivre: correct ? target : `${target}9`,
        correta: correct,
        tempo_ms: 20_000,
      };
    }
    const wrong = item.correta === 0 ? 1 : 0;
    return {
      itemId: item.id,
      escolhaIndex: correct ? item.correta : wrong,
      correta: correct,
      tempo_ms: 20_000,
    };
  });

describe('iq scoring', () => {
  it('never reports a percentile without a sample to compare against', () => {
    // The single most important assertion in this file. A percentile computed
    // from an assumed curve is a fabricated claim about someone's mind.
    expect(scoreIq(answerAll(true)).percentil).toBeNull();
    expect(scoreIq(answerAll(false)).percentil).toBeNull();
    expect(scoreIq([]).percentil).toBeNull();
  });

  it('counts every item and no more', () => {
    const perfect = scoreIq(answerAll(true));
    expect(perfect.acertos).toBe(ITEMS.length);
    expect(perfect.total).toBe(ITEMS.length);
    expect(scoreIq(answerAll(false)).acertos).toBe(0);
  });

  it('guarda o bruto do item interativo FORA da pontuacao do teste', () => {
    // Os dois lados importam. O bruto precisa existir, porque e o unico
    // registro de tempo e tentativas que o modelo psicometrico futuro vai ter.
    // E nao pode entrar em `pontos`, porque dar peso proprio a um item exige
    // amostra — hoje ele vale o mesmo que os outros 44.
    const perfeito = scoreIq(answerAll(true));
    const bruto = perfeito.interativos ?? [];
    expect(bruto).toHaveLength(1);
    expect(bruto[0].itemId).toBe('ESP-14');
    expect(bruto[0].valido).toBe(true);
    expect(bruto[0].acertos).toBe(3);
    expect(bruto[0].score).toBeGreaterThan(0);

    // O peso na escala do teste e o do item, e nada alem dele.
    const semInterativo = ITEMS.filter((i) => i.formato_alternativas !== 'interativo');
    const soOsOutros = scoreIq(answerAll(true), semInterativo);
    expect(perfeito.total - soOsOutros.total).toBe(1);
  });

  it('scores a perfect run above a failed one', () => {
    expect(scoreIq(answerAll(true)).pontos).toBeGreaterThan(scoreIq(answerAll(false)).pontos);
  });

  it('weights hard items above easy ones', () => {
    const onlyEasy = ITEMS.filter((i) => i.dificuldade <= 2).map((i) => i.id);
    const onlyHard = ITEMS.filter((i) => i.dificuldade >= 4).map((i) => i.id);

    const answerOnly = (ids: string[]) =>
      answerAll(true).map((r) => (ids.includes(r.itemId) ? r : { ...r, escolhaIndex: -1, entradaLivre: 'x' }));

    // Fewer hard items than easy ones, and still worth more.
    expect(onlyHard.length).toBeLessThan(onlyEasy.length);
    expect(scoreIq(answerOnly(onlyHard)).pontos).toBeGreaterThan(scoreIq(answerOnly(onlyEasy)).pontos);
  });

  it('lets accuracy dominate speed', () => {
    // Someone who rushes and is wrong must never beat someone slow and right.
    const fastAndWrong = answerAll(false).map((r) => ({ ...r, tempo_ms: 2_000 }));
    const slowAndRight = answerAll(true).map((r) => ({ ...r, tempo_ms: 60_000 }));
    expect(scoreIq(slowAndRight).pontos).toBeGreaterThan(scoreIq(fastAndWrong).pontos);
  });

  describe('speed factor', () => {
    it('stays inside its band however long the run takes', () => {
      for (const ms of [0, 1_000, SPEED.fastMs, SPEED.neutralMs, SPEED.slowMs, 10 * 60 * 60 * 1000]) {
        const f = speedFactor(ms);
        expect(f).toBeGreaterThanOrEqual(SPEED.min);
        expect(f).toBeLessThanOrEqual(SPEED.max);
      }
    });

    it('is exactly neutral at the neutral time', () => {
      expect(speedFactor(SPEED.neutralMs)).toBeCloseTo(1, 5);
    });

    it('never rewards being slower', () => {
      let previous = speedFactor(0);
      for (let ms = 0; ms <= SPEED.slowMs; ms += 60_000) {
        const f = speedFactor(ms);
        expect(f).toBeLessThanOrEqual(previous + 1e-9);
        previous = f;
      }
    });
  });

  describe('free entry', () => {
    const inverso = ITEMS.find((i) => i.memoria?.cobrar === 'inverso')!;

    it('compares the reversed sequence, not the original', () => {
      const forward = inverso.memoria!.estimulo.replace(/\s+/g, '');
      const backward = [...forward].reverse().join('');

      const answer = (text: string): Resposta => ({
        itemId: inverso.id,
        escolhaIndex: null,
        entradaLivre: text,
        correta: false,
        tempo_ms: 1000,
      });

      expect(isCorrect(inverso, answer(backward))).toBe(true);
      expect(isCorrect(inverso, answer(forward)).valueOf()).toBe(forward === backward);
    });

    it('ignores spacing', () => {
      const item = ITEMS.find((i) => i.memoria?.cobrar === 'sequencia_completa')!;
      const digits = item.memoria!.estimulo.replace(/\s+/g, '');
      const spaced = [...digits].join(' ');

      const answer = (text: string): Resposta => ({
        itemId: item.id, escolhaIndex: null, entradaLivre: text, correta: false, tempo_ms: 1000,
      });

      expect(isCorrect(item, answer(spaced))).toBe(true);
      expect(isCorrect(item, answer(digits))).toBe(true);
    });

    it('rejects an empty answer', () => {
      const item = ITEMS.find((i) => i.memoria?.cobrar === 'sequencia_completa')!;
      expect(isCorrect(item, {
        itemId: item.id, escolhaIndex: null, entradaLivre: '', correta: false, tempo_ms: 1000,
      })).toBe(false);
    });
  });

  it('names two strengths and two weaknesses, and never the same one twice', () => {
    const r = scoreIq(answerAll(true).map((x, i) => (i % 3 === 0 ? { ...x, escolhaIndex: -1, entradaLivre: 'x' } : x)));
    expect(r.pontosFortes).toHaveLength(2);
    expect(r.pontosFracos).toHaveLength(2);
    expect(new Set([...r.pontosFortes, ...r.pontosFracos]).size).toBe(4);
  });

  it('covers all six dimensions in the profile', () => {
    expect(scoreIq(answerAll(true)).perfil).toHaveLength(6);
  });
});
