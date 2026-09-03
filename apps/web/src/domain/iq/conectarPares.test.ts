import { describe, expect, it } from 'vitest';
import {
  itemAcertou,
  parEhCorreto,
  scoreBruto,
  segmentosCruzam,
  tracadoCruza,
  type Ligacao,
  type ResultadoConectarPares,
} from './conectarPares';

/**
 * A geometria e a parte perigosa deste item.
 *
 * Um cruzamento aceito por engano, ou um traco valido recusado, transforma a
 * questao num teste de sorte — e nenhum dos dois e visivel olhando a tela,
 * porque o traco fica bonito do mesmo jeito. Pior: num item cronometrado, uma
 * recusa injusta faz a pessoa perder segundos achando que errou.
 */

const seg = (ax: number, ay: number, bx: number, by: number) => ({ ax, ay, bx, by });

describe('segmentosCruzam', () => {
  it('detecta um X', () => {
    expect(segmentosCruzam(seg(0, 0, 10, 10), seg(0, 10, 10, 0))).toBe(true);
  });

  it('nao ve cruzamento em paralelas', () => {
    expect(segmentosCruzam(seg(0, 0, 10, 0), seg(0, 5, 10, 5))).toBe(false);
  });

  it('nao ve cruzamento quando um passa longe do outro', () => {
    expect(segmentosCruzam(seg(0, 0, 1, 1), seg(50, 50, 60, 60))).toBe(false);
  });

  it('trata toque em T como cruzamento', () => {
    // A ponta de um encostando no meio do outro atravessa a linha na pratica.
    expect(segmentosCruzam(seg(5, 0, 5, 5), seg(0, 5, 10, 5))).toBe(true);
  });

  it('trata sobreposicao colinear como cruzamento', () => {
    // Desenhar por cima de uma linha existente e o que a regra proibe, mesmo
    // que os segmentos nao se "cortem" num ponto.
    expect(segmentosCruzam(seg(0, 0, 10, 0), seg(5, 0, 15, 0))).toBe(true);
  });

  it('nao ve cruzamento em segmentos colineares separados', () => {
    expect(segmentosCruzam(seg(0, 0, 10, 0), seg(20, 0, 30, 0))).toBe(false);
  });
});

describe('tracadoCruza', () => {
  const ligacao = (tracado: { x: number; y: number }[]): Ligacao => ({
    de: 'a',
    para: 'b',
    tracado,
    correta: true,
  });

  it('barra um tracado que atravessa outro', () => {
    const existente = [ligacao([{ x: 0, y: 50 }, { x: 100, y: 50 }])];
    const novo = [{ x: 50, y: 0 }, { x: 50, y: 100 }];
    expect(tracadoCruza(novo, existente)).toBe(true);
  });

  it('libera um tracado que passa ao lado', () => {
    const existente = [ligacao([{ x: 0, y: 50 }, { x: 100, y: 50 }])];
    const novo = [{ x: 0, y: 80 }, { x: 100, y: 80 }];
    expect(tracadoCruza(novo, existente)).toBe(false);
  });

  it('libera dois tracos que partem de perto do mesmo lugar', () => {
    // Sem a tolerancia nas pontas, este caso seria recusado — e ele e valido:
    // dois pares vizinhos se tocam ali por geometria, nao por cruzamento.
    const existente = [ligacao([{ x: 10, y: 10 }, { x: 90, y: 10 }])];
    const novo = [{ x: 11, y: 11 }, { x: 90, y: 90 }];
    expect(tracadoCruza(novo, existente)).toBe(false);
  });

  it('nao acusa nada quando nao ha tracado', () => {
    expect(tracadoCruza([{ x: 5, y: 5 }], [])).toBe(false);
    expect(tracadoCruza([], [])).toBe(false);
  });

  it('confere contra TODAS as ligacoes existentes, nao so a ultima', () => {
    const existentes = [
      ligacao([{ x: 0, y: 20 }, { x: 100, y: 20 }]),
      ligacao([{ x: 0, y: 80 }, { x: 100, y: 80 }]),
    ];
    const novo = [{ x: 50, y: 0 }, { x: 50, y: 40 }];
    expect(tracadoCruza(novo, existentes)).toBe(true);
  });
});

describe('parEhCorreto', () => {
  const pares: [string, string][] = [
    ['azul1', 'azul2'],
    ['rosa1', 'rosa2'],
  ];

  it('aceita o par nas duas direcoes', () => {
    expect(parEhCorreto('azul1', 'azul2', pares)).toBe(true);
    expect(parEhCorreto('azul2', 'azul1', pares)).toBe(true);
  });

  it('recusa uma ligacao entre cores diferentes', () => {
    expect(parEhCorreto('azul1', 'rosa2', pares)).toBe(false);
  });
});

describe('scoreBruto', () => {
  const base = (over: Partial<ResultadoConectarPares> = {}): ResultadoConectarPares => ({
    motivo: 'completou',
    tempoGasto: 30_000,
    acertos: 3,
    erros: 0,
    faltantes: 0,
    bloqueios: 0,
    ligacoes: [],
    ...over,
  });

  it('fica entre 0 e 100 em qualquer combinacao', () => {
    const casos = [
      base(),
      base({ acertos: 0, faltantes: 3, tempoGasto: 60_000, bloqueios: 20 }),
      base({ acertos: 1, erros: 2, bloqueios: 3 }),
      base({ tempoGasto: 0 }),
    ];
    for (const c of casos) {
      const s = scoreBruto(c, 60_000);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it('premia acertar acima de tudo', () => {
    const tudoCerto = scoreBruto(base(), 60_000);
    const metade = scoreBruto(base({ acertos: 1, faltantes: 2 }), 60_000);
    expect(tudoCerto).toBeGreaterThan(metade);
  });

  it('premia terminar antes, com o mesmo acerto', () => {
    const rapido = scoreBruto(base({ tempoGasto: 10_000 }), 60_000);
    const lento = scoreBruto(base({ tempoGasto: 55_000 }), 60_000);
    expect(rapido).toBeGreaterThan(lento);
  });

  it('nao paga velocidade a quem nao ligou nada', () => {
    // Sem esta guarda, desistir no primeiro segundo seria o caminho mais
    // barato para uma pontuacao alta.
    const desistiuCedo = scoreBruto(
      base({ motivo: 'desistiu', acertos: 0, faltantes: 3, tempoGasto: 500 }),
      60_000,
    );
    const tentouEFalhou = scoreBruto(
      base({ acertos: 0, faltantes: 3, tempoGasto: 60_000 }),
      60_000,
    );
    expect(desistiuCedo).toBe(tentouEFalhou);
  });

  it('cobra pouco por bloqueio, e nunca abaixo de zero', () => {
    const limpo = scoreBruto(base(), 60_000);
    const comBloqueios = scoreBruto(base({ bloqueios: 4 }), 60_000);
    const muitos = scoreBruto(base({ bloqueios: 99 }), 60_000);
    expect(comBloqueios).toBeLessThan(limpo);
    expect(limpo - comBloqueios).toBeLessThanOrEqual(10);
    expect(muitos).toBeGreaterThanOrEqual(0);
  });

  it('devolve zero quando nao ha pares no item', () => {
    expect(scoreBruto(base({ acertos: 0, erros: 0, faltantes: 0 }), 60_000)).toBe(0);
  });
});

describe('itemAcertou', () => {
  const r = (over: Partial<ResultadoConectarPares>): ResultadoConectarPares => ({
    motivo: 'completou',
    tempoGasto: 1000,
    acertos: 3,
    erros: 0,
    faltantes: 0,
    bloqueios: 0,
    ligacoes: [],
    ...over,
  });

  it('so acerta com todos os pares ligados e nenhum errado', () => {
    expect(itemAcertou(r({}))).toBe(true);
    expect(itemAcertou(r({ faltantes: 1, acertos: 2 }))).toBe(false);
    expect(itemAcertou(r({ erros: 1, acertos: 2 }))).toBe(false);
    expect(itemAcertou(r({ acertos: 0, faltantes: 0, erros: 0 }))).toBe(false);
  });
});
