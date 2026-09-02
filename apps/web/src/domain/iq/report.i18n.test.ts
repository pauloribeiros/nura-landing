import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';
import ptBr from '../../../messages/pt-br.json';
import { buildIqReportPlan, type FaixaDimensao, type Ritmo } from './report';
import type { IqResult } from './scoring';
import type { Dimensao } from './types';

/**
 * Toda chave que a view do relatorio pode pedir existe nos tres idiomas.
 *
 * ESTE E O RISCO REAL DESTE RELATORIO. O texto e escolhido em tempo de
 * execucao a partir dos dados — faixa da dimensao, forma do perfil, ritmo — e
 * uma combinacao rara so aparece quando alguem cair nela. Sem este teste, a
 * primeira pessoa com perfil irregular e ritmo lento seria quem descobriria a
 * chave faltando, num documento pelo qual ela pagou.
 *
 * O projeto nao tem jsdom, entao nao da para renderizar o componente aqui. O
 * que da, e o que importa, e garantir que o catalogo responde a todas as
 * perguntas que ele vai fazer.
 */

const CATALOGOS = { 'pt-br': ptBr, en, es } as Record<string, Record<string, unknown>>;

const DIMENSOES: Dimensao[] = [
  'reconhecimento_padroes',
  'pensamento_analitico',
  'raciocinio_abstrato',
  'orientacao_espacial',
  'percepcao_visual',
  'memoria_trabalho',
];
const FAIXAS: FaixaDimensao[] = ['alto', 'medio', 'baixo'];
const RITMOS: Ritmo[] = ['rapidoPreciso', 'rapidoImpreciso', 'lentoPreciso', 'lentoImpreciso'];

function valorEm(catalogo: Record<string, unknown>, caminho: string): unknown {
  return caminho
    .split('.')
    .reduce<unknown>(
      (no, parte) =>
        no && typeof no === 'object' ? (no as Record<string, unknown>)[parte] : undefined,
      catalogo,
    );
}

/** Todo caminho que a view pede, para qualquer resultado possivel. */
function caminhosPossiveis(): string[] {
  const fixos = [
    'eyebrow',
    'title',
    'lead',
    'generatedOn',
    'scoreLabel',
    'correctLabel',
    'timeLabel',
    'noPercentile',
    'closingTitle',
    'closing',
    'disclaimer',
    'print',
    'printHint',
    'q3.lead',
    'q5.lead',
    'q1.corpo',
    'q1.nota',
    'q6.corpo',
    'q6.nota',
    'q4.doisEixos',
    'q4.umEixo',
  ];

  const secoes = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((id) => `sections.${id}`);
  const pontuacao = ['acima', 'centro', 'abaixo'].map((k) => `q2.${k}`);
  const perfil = ['parelho', 'misto', 'irregular'].map((k) => `q3.${k}`);
  const ritmo = RITMOS.map((r) => `q5.${r}`);
  const significa = DIMENSOES.map((d) => `dimensionMeans.${d}`);
  const leituras = DIMENSOES.flatMap((d) => FAIXAS.map((f) => `reading.${d}.${f}`));

  return [...fixos, ...secoes, ...pontuacao, ...perfil, ...ritmo, ...significa, ...leituras];
}

describe('catalogo do relatorio de raciocinio', () => {
  for (const [locale, catalogo] of Object.entries(CATALOGOS)) {
    it(`${locale} responde a todas as chaves que a view pode pedir`, () => {
      const raiz = catalogo.iq_report as Record<string, unknown> | undefined;
      expect(raiz, `${locale} nao tem iq_report`).toBeDefined();

      const faltando = caminhosPossiveis().filter((c) => typeof valorEm(raiz!, c) !== 'string');
      expect(faltando, `${locale}: chaves ausentes`).toEqual([]);
    });

    it(`${locale} tem o nome das seis dimensoes`, () => {
      // A view usa `iq.dimensions.<d>` para os nomes, fora do namespace do
      // relatorio — e a secao 04 interpola dois deles dentro da frase.
      const dims = (catalogo.iq as Record<string, unknown>)?.dimensions as Record<string, unknown>;
      expect(dims, `${locale} nao tem iq.dimensions`).toBeDefined();
      for (const d of DIMENSOES) expect(typeof dims[d], `${locale}: ${d}`).toBe('string');
    });
  }
});

describe('todo plano possivel encontra o seu texto', () => {
  function resultado(over: Partial<IqResult>): IqResult {
    return {
      scoringVersion: 'test-1',
      pontos: 105,
      percentil: null,
      tempoTotal_ms: 18 * 60 * 1000,
      fatorVelocidade: 1,
      acertos: 30,
      total: 45,
      perfil: DIMENSOES.map((dimensao) => ({
        dimensao,
        acertos: 5,
        total: 8,
        percentual: 62.5,
      })),
      pontosFortes: ['reconhecimento_padroes', 'pensamento_analitico'],
      pontosFracos: ['memoria_trabalho', 'percepcao_visual'],
      ...over,
    };
  }

  const cenarios: Array<[string, Partial<IqResult>]> = [
    ['pontuacao alta e rapido', { pontos: 140, tempoTotal_ms: 6 * 60 * 1000, acertos: 40 }],
    ['pontuacao baixa e lento', { pontos: 70, tempoTotal_ms: 40 * 60 * 1000, acertos: 8 }],
    ['perfil irregular', {
      perfil: DIMENSOES.map((dimensao, i) => ({
        dimensao,
        acertos: i === 0 ? 8 : 0,
        total: 8,
        percentual: i === 0 ? 100 : 0,
      })),
    }],
    ['sem dois eixos fortes', { pontosFortes: ['memoria_trabalho'] }],
  ];

  for (const [nome, over] of cenarios) {
    it(`${nome}: cada secao aponta para uma frase existente`, () => {
      const plano = buildIqReportPlan(resultado(over));
      for (const [locale, catalogo] of Object.entries(CATALOGOS)) {
        const raiz = catalogo.iq_report as Record<string, unknown>;
        for (const secao of plano.secoes) {
          const caminho = `${secao.id}.${secao.corpoKey}`;
          expect(typeof valorEm(raiz, caminho), `${locale}: ${caminho}`).toBe('string');
        }
        for (const d of plano.dimensoes) {
          const caminho = `reading.${d.dimensao}.${d.faixa}`;
          expect(typeof valorEm(raiz, caminho), `${locale}: ${caminho}`).toBe('string');
        }
      }
    });
  }
});
