import { describe, expect, it } from 'vitest';
import { ITEMS, byId } from './bank';
import { consecutiveRepeats, interleaveByType } from './interleave';
import { buildRunOrder } from './memoryQueue';
import { BREAKS } from './breaks';
import type { Item } from './types';

/**
 * Two properties have to hold at once, and they pull against each other:
 * the same kind of puzzle must not run in a row, and the test must still get
 * harder as it goes. Either alone is easy; this pins both.
 */

const original = ITEMS.slice().sort((a, b) => a.ordem - b.ordem);
const spread = interleaveByType(ITEMS);


/**
 * A posicao fixa e uma excecao a regra da banda, e excecao sem teste vira
 * regra quebrada em silencio: o item voltaria para o fim da fila e ninguem
 * perceberia ate alguem refazer o teste inteiro.
 */
describe('posicao fixa', () => {
  const item = (id: string, ordem: number, dificuldade: 1 | 2 | 3 | 4 | 5, tipo: string, posicaoFixa?: number) =>
    ({ id, ordem, dificuldade, tipo, posicaoFixa } as unknown as Item);

  it('poe o item onde ele pede, mesmo vindo de uma banda mais dificil', () => {
    const itens = [
      item('a', 1, 1, 'x'),
      item('b', 2, 1, 'y'),
      item('c', 3, 1, 'x'),
      item('dificil', 4, 5, 'z', 2),
    ];
    expect(interleaveByType(itens).map((i) => i.id)).toEqual(['a', 'dificil', 'b', 'c']);
  });

  it('nao muda a ordem de quem nao pediu nada', () => {
    const base = [item('a', 1, 1, 'x'), item('b', 2, 2, 'y'), item('c', 3, 3, 'x')];
    const comFixo = [...base, item('f', 4, 5, 'z', 1)];
    const semOFixo = interleaveByType(comFixo).filter((i) => i.id !== 'f').map((i) => i.id);
    expect(semOFixo).toEqual(interleaveByType(base).map((i) => i.id));
  });

  it('duas fixas nao empurram uma a outra', () => {
    const itens = [
      item('a', 1, 1, 'x'),
      item('b', 2, 1, 'y'),
      item('p', 3, 5, 'z', 1),
      item('q', 4, 5, 'w', 3),
    ];
    expect(interleaveByType(itens).map((i) => i.id)).toEqual(['p', 'a', 'q', 'b']);
  });

  it('uma posicao fora do intervalo entra na ponta, e nao some', () => {
    const itens = [item('a', 1, 1, 'x'), item('z', 2, 5, 'y', 99)];
    const saida = interleaveByType(itens).map((i) => i.id);
    expect(saida).toHaveLength(2);
    expect(saida[saida.length - 1]).toBe('z');
  });

  it('CONECTAR PARES CAI DEPOIS DA PRIMEIRA TELA DE PROGRESSAO', () => {
    // A primeira transicao aparece depois da 12a resposta e promete que as
    // proximas ficam mais dificeis. O desafio e a 14a: uma questao comum entre
    // a promessa e o cumprimento dela.
    const respostas = buildRunOrder(interleaveByType(ITEMS)).filter((s) => s.kind !== 'memory-show');
    expect(respostas.findIndex((s) => s.item.id === 'ESP-14') + 1).toBe(14);
    expect(BREAKS[0].after).toBe(12);
    // E continua valendo o que vale: a posicao nao mexeu no peso.
    expect(byId('ESP-14')!.dificuldade).toBe(4);
  });
});

describe('interleaving', () => {
  it('keeps every item exactly once', () => {
    expect(spread).toHaveLength(original.length);
    expect(new Set(spread.map((i) => i.id)).size).toBe(original.length);
  });

  it('never lets difficulty go backwards, exceto para quem declarou excecao', () => {
    // The constraint that makes moving items around safe at all.
    //
    // A rampa continua sendo a regra: quem nao declara `posicaoFixa` e
    // verificado par a par, sem folga. O item fixado e retirado da conta
    // porque quebrar a rampa e o efeito que ele pede explicitamente — e a
    // excecao fica limitada a quem a pediu, em vez de afrouxar a regra para
    // todo mundo.
    const naRampa = spread.filter((i) => typeof i.posicaoFixa !== 'number');
    expect(naRampa.length, 'a excecao virou regra').toBeGreaterThan(spread.length - 3);
    for (let i = 1; i < naRampa.length; i += 1) {
      expect(naRampa[i].dificuldade).toBeGreaterThanOrEqual(naRampa[i - 1].dificuldade);
    }
  });

  it('breaks up runs of the same puzzle type', () => {
    const before = consecutiveRepeats(original);
    const after = consecutiveRepeats(spread);
    expect(after).toBeLessThan(before);
  });

  it('leaves no long run of one type in the opening third', () => {
    // Where the complaint came from: four odd-one-out screens in a row read as
    // one question asked four times.
    const opening = spread.slice(0, 15);
    let run = 1;
    let worst = 1;
    for (let i = 1; i < opening.length; i += 1) {
      run = opening[i].tipo === opening[i - 1].tipo ? run + 1 : 1;
      worst = Math.max(worst, run);
    }
    expect(worst).toBeLessThanOrEqual(2);
  });

  it('is deterministic', () => {
    // Two runs of the same test must be comparable, which a shuffle would end.
    expect(interleaveByType(ITEMS).map((i) => i.id)).toEqual(spread.map((i) => i.id));
  });

  it('survives a band that holds only one type', () => {
    const single = ITEMS.filter((i) => i.tipo === ITEMS[0].tipo);
    expect(interleaveByType(single)).toHaveLength(single.length);
  });
});
