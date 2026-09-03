import { describe, expect, it } from 'vitest';
import {
  LIMITE_LIGACOES,
  LIMITE_PONTOS_POR_LIGACAO,
  conferirBruto,
  lerDesenhoDoCliente,
} from './conectarPares';
import { CONECTAR_PARES_01, SOLUCOES } from './itensInterativos';

/**
 * O que estes testes protegem e a fronteira: tudo aqui chega pela rede, escrito
 * por quem quiser escrever. O primeiro corte deste item ia bem ate aqui — o
 * desenho era validado na tela e ignorado no servidor, e o item contava como
 * errado para todo mundo, inclusive para quem resolveu.
 */

const CONFIG = CONECTAR_PARES_01.config;
const LIMITE_MS = CONFIG.tempoLimite * 1000;
const SOLUCAO = SOLUCOES['ESP-14'].map((l) => ({ ...l, correta: true }));

const desenhoValido = (over: Record<string, unknown> = {}) => ({
  motivo: 'completou',
  tempoGasto: 20_000,
  acertos: 3,
  erros: 0,
  faltantes: 0,
  bloqueios: 0,
  ligacoes: SOLUCAO,
  ...over,
});

describe('lerDesenhoDoCliente', () => {
  it('aceita um desenho bem formado', () => {
    const lido = lerDesenhoDoCliente(desenhoValido());
    expect(lido).not.toBeNull();
    expect(lido!.ligacoes).toHaveLength(3);
    expect(lido!.motivo).toBe('completou');
  });

  it('NAO IMPORTA os acertos que o cliente afirma ter feito', () => {
    // O campo existe no payload e e ignorado: quem conta e `conferirBruto`.
    const lido = lerDesenhoDoCliente(desenhoValido({ acertos: 99, erros: 0, faltantes: 0 }));
    expect(lido!.acertos).toBe(0);
    expect(lido!.erros).toBe(0);
    expect(lido!.faltantes).toBe(0);
  });

  it('nao aceita `correta` vindo do cliente', () => {
    const mentira = SOLUCAO.map((l) => ({ ...l, de: 'azul1', para: 'rosa2', correta: true }));
    const lido = lerDesenhoDoCliente(desenhoValido({ ligacoes: mentira }));
    expect(lido!.ligacoes.every((l) => l.correta === false)).toBe(true);
  });

  it('recusa lixo no lugar do desenho', () => {
    for (const entrada of [null, undefined, 42, 'x', {}, { ligacoes: 'nao-e-array' }]) {
      expect(lerDesenhoDoCliente(entrada)).toBeNull();
    }
  });

  it('recusa uma ligacao sem tracado utilizavel', () => {
    expect(lerDesenhoDoCliente(desenhoValido({ ligacoes: [{ de: 'a', para: 'b', tracado: [] }] }))).toBeNull();
    expect(
      lerDesenhoDoCliente(
        desenhoValido({ ligacoes: [{ de: 'a', para: 'b', tracado: [{ x: 1, y: 1 }] }] }),
      ),
    ).toBeNull();
  });

  it('recusa coordenadas que nao vieram de uma tela', () => {
    for (const ponto of [{ x: NaN, y: 0 }, { x: 1e9, y: 0 }, { x: '5', y: 5 }, { x: 0 }]) {
      const ligacoes = [{ de: 'a', para: 'b', tracado: [{ x: 0, y: 0 }, ponto] }];
      expect(lerDesenhoDoCliente(desenhoValido({ ligacoes }))).toBeNull();
    }
  });

  it('POE TETO NO TAMANHO: um desenho gigante trava o servidor, nao a pessoa', () => {
    // A checagem de cruzamento e quadratica no numero de segmentos. Sem teto,
    // um payload com centenas de milhares de pontos e uma requisicao que
    // derruba o processo.
    const enorme = Array.from({ length: LIMITE_PONTOS_POR_LIGACAO + 1 }, (_, i) => ({
      x: i % 100,
      y: (i * 7) % 100,
    }));
    expect(
      lerDesenhoDoCliente(desenhoValido({ ligacoes: [{ de: 'a', para: 'b', tracado: enorme }] })),
    ).toBeNull();

    const muitas = Array.from({ length: LIMITE_LIGACOES + 1 }, () => SOLUCAO[0]);
    expect(lerDesenhoDoCliente(desenhoValido({ ligacoes: muitas }))).toBeNull();
  });

  it('prende o numero de bloqueios e nao aceita tempo negativo', () => {
    const lido = lerDesenhoDoCliente(desenhoValido({ bloqueios: 1e6, tempoGasto: -5000 }));
    expect(lido!.bloqueios).toBeLessThanOrEqual(50);
    expect(lido!.tempoGasto).toBe(0);
  });

  it('trata um motivo desconhecido como desistencia', () => {
    expect(lerDesenhoDoCliente(desenhoValido({ motivo: 'ganhei' }))!.motivo).toBe('desistiu');
  });
});

describe('conferirBruto', () => {
  it('reconhece a solucao declarada, ligando tudo sem cruzar', () => {
    const lido = lerDesenhoDoCliente(desenhoValido())!;
    const c = conferirBruto(lido, CONFIG.paresCorretos, LIMITE_MS);
    expect(c.valido).toBe(true);
    expect(c.acertos).toBe(3);
    expect(c.faltantes).toBe(0);
    expect(c.score).toBeGreaterThan(70);
  });

  it('NAO PAGA por um desenho que cruza, mesmo o cliente jurando que acertou', () => {
    // O traco rosa em linha reta atravessa o azul. Na tela ele seria recusado;
    // forjado no payload, ele precisa ser recusado aqui tambem.
    const reto = [
      { de: 'azul1', para: 'azul2', tracado: [{ x: 42, y: 8 }, { x: 44, y: 66 }], correta: true },
      { de: 'amar1', para: 'amar2', tracado: [{ x: 58, y: 52 }, { x: 60, y: 92 }], correta: true },
      { de: 'rosa1', para: 'rosa2', tracado: [{ x: 8, y: 72 }, { x: 92, y: 44 }], correta: true },
    ];
    const lido = lerDesenhoDoCliente(desenhoValido({ ligacoes: reto, acertos: 3 }))!;
    const c = conferirBruto(lido, CONFIG.paresCorretos, LIMITE_MS);
    expect(c.valido).toBe(false);
    expect(c.acertos).toBe(2);
    expect(c.faltantes).toBe(1);
  });

  it('nao vende velocidade: tempo zero nao vale mais que o limite do item', () => {
    // Sem o limite, `tempoGasto: 0` compraria o bonus inteiro de graca.
    const rapido = conferirBruto(
      lerDesenhoDoCliente(desenhoValido({ tempoGasto: 0 }))!,
      CONFIG.paresCorretos,
      LIMITE_MS,
    );
    const impossivel = conferirBruto(
      lerDesenhoDoCliente(desenhoValido({ tempoGasto: -1_000_000 }))!,
      CONFIG.paresCorretos,
      LIMITE_MS,
    );
    expect(impossivel.score).toBe(rapido.score);
    expect(impossivel.tempoGasto_ms).toBe(0);

    const alem = conferirBruto(
      lerDesenhoDoCliente(desenhoValido({ tempoGasto: 10 * LIMITE_MS }))!,
      CONFIG.paresCorretos,
      LIMITE_MS,
    );
    expect(alem.tempoGasto_ms).toBe(LIMITE_MS);
  });

  it('devolve zero acertos para quem nao desenhou nada', () => {
    const c = conferirBruto(
      lerDesenhoDoCliente(desenhoValido({ ligacoes: [] }))!,
      CONFIG.paresCorretos,
      LIMITE_MS,
    );
    expect(c.acertos).toBe(0);
    expect(c.faltantes).toBe(3);
    expect(c.score).toBeLessThan(20);
  });
});
