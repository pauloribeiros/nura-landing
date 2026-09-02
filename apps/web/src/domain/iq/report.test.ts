import { describe, expect, it } from 'vitest';
import { buildIqReportPlan, faixaDe, ritmoDe, MINUTOS_REFERENCIA } from './report';
import type { IqResult } from './scoring';
import type { Dimensao } from './types';

/**
 * O que estes testes protegem e a regra que escolhe a frase.
 *
 * O texto vive no catalogo de mensagens e muda sem aviso; o que nao pode mudar
 * sem alguem perceber e a decisao — qual faixa, qual ritmo, qual corpo de
 * secao. Um engano aqui nao quebra a pagina: ela abre e diz a coisa errada
 * sobre a cabeca de alguem, que e pior.
 */

const DIMENSOES: Dimensao[] = [
  'reconhecimento_padroes',
  'pensamento_analitico',
  'raciocinio_abstrato',
  'orientacao_espacial',
  'percepcao_visual',
  'memoria_trabalho',
];

function resultado(over: Partial<IqResult> = {}): IqResult {
  const perfil = DIMENSOES.map((dimensao) => ({
    dimensao,
    acertos: 5,
    total: 8,
    percentual: 62.5,
  }));
  return {
    scoringVersion: 'test-1',
    pontos: 105,
    percentil: null,
    tempoTotal_ms: 18 * 60 * 1000,
    fatorVelocidade: 1,
    acertos: 30,
    total: 45,
    perfil,
    pontosFortes: ['reconhecimento_padroes', 'pensamento_analitico'],
    pontosFracos: ['memoria_trabalho', 'percepcao_visual'],
    ...over,
  };
}

describe('faixaDe', () => {
  it('separa as tres faixas nos cortes', () => {
    expect(faixaDe(100)).toBe('alto');
    expect(faixaDe(70)).toBe('alto');
    expect(faixaDe(69)).toBe('medio');
    expect(faixaDe(40)).toBe('medio');
    expect(faixaDe(39)).toBe('baixo');
    expect(faixaDe(0)).toBe('baixo');
  });
});

describe('ritmoDe', () => {
  it('cruza tempo e precisao nos quatro casos', () => {
    expect(ritmoDe(10, 30, 45)).toBe('rapidoPreciso');
    expect(ritmoDe(10, 10, 45)).toBe('rapidoImpreciso');
    expect(ritmoDe(30, 30, 45)).toBe('lentoPreciso');
    expect(ritmoDe(30, 10, 45)).toBe('lentoImpreciso');
  });

  it('trata o tempo de referencia como ainda rapido', () => {
    // O corte precisa ser inclusivo: quem termina exatamente no tempo previsto
    // nao deveria ser descrito como lento.
    expect(ritmoDe(MINUTOS_REFERENCIA, 30, 45)).toBe('rapidoPreciso');
    expect(ritmoDe(MINUTOS_REFERENCIA + 1, 30, 45)).toBe('lentoPreciso');
  });
});

describe('buildIqReportPlan', () => {
  it('monta as seis secoes, na ordem', () => {
    const plano = buildIqReportPlan(resultado());
    expect(plano.secoes.map((s) => s.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6']);
  });

  it('escolhe o corpo da pontuacao pela distancia ao centro da escala', () => {
    expect(buildIqReportPlan(resultado({ pontos: 130 })).secoes[1].corpoKey).toBe('acima');
    expect(buildIqReportPlan(resultado({ pontos: 105 })).secoes[1].corpoKey).toBe('centro');
    expect(buildIqReportPlan(resultado({ pontos: 80 })).secoes[1].corpoKey).toBe('abaixo');
  });

  it('descreve a forma do perfil pela distancia entre o melhor e o pior eixo', () => {
    const parelho = buildIqReportPlan(resultado());
    expect(parelho.secoes[2].corpoKey).toBe('parelho');

    const perfil = DIMENSOES.map((dimensao, i) => ({
      dimensao,
      acertos: i,
      total: 8,
      percentual: i === 0 ? 100 : i === 5 ? 0 : 50,
    }));
    const irregular = buildIqReportPlan(resultado({ perfil }));
    expect(irregular.secoes[2].corpoKey).toBe('irregular');
    expect(irregular.secoes[2].params?.amplitude).toBe(100);
  });

  it('marca destaque so nos dois melhores e nos dois piores', () => {
    const plano = buildIqReportPlan(resultado());
    const fortes = plano.dimensoes.filter((d) => d.destaque === 'forte').map((d) => d.dimensao);
    const fracos = plano.dimensoes.filter((d) => d.destaque === 'fraco').map((d) => d.dimensao);
    expect(fortes).toEqual(['reconhecimento_padroes', 'pensamento_analitico']);
    expect(fracos).toEqual(['percepcao_visual', 'memoria_trabalho']);
    expect(plano.dimensoes.filter((d) => d.destaque === null)).toHaveLength(2);
  });

  it('cai para um eixo quando o teste nao separou fortes e fracos', () => {
    const plano = buildIqReportPlan(resultado({ pontosFortes: ['memoria_trabalho'] }));
    expect(plano.secoes[3].corpoKey).toBe('umEixo');
  });

  it('nunca inventa percentil', () => {
    // Enquanto nao houver amostra medida, comparar seria mentir — e comparacao
    // e justamente a primeira coisa que alguem procura num teste destes.
    expect(buildIqReportPlan(resultado()).percentil).toBeNull();
  });

  it('arredonda o tempo para pelo menos um minuto', () => {
    // Uma corrida de poucos segundos existe (o atalho de QA cria uma) e nao
    // pode virar "0 minutos" no texto.
    const plano = buildIqReportPlan(resultado({ tempoTotal_ms: 4000 }));
    expect(plano.minutos).toBe(1);
  });
});
