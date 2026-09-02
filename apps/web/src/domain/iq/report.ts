import type { Dimensao, ScoreDimensao } from './types';
import type { IqResult } from './scoring';
import { BASE } from './scoring-config';

/**
 * O plano do relatorio pago de raciocinio.
 *
 * Mesma divisao do relatorio de TDAH: aqui se decide O QUE dizer a partir dos
 * dados, e o catalogo de mensagens guarda COMO dizer. Nenhuma frase mora neste
 * arquivo — o que mora e a regra que escolhe a frase.
 *
 * O QUE ESTE RELATORIO NAO FAZ e afirmar um QI. A pontuacao e uma escala
 * propria, calibrada para este banco de 45 itens, e o texto diz isso na
 * primeira secao em vez de esconder na letra miuda. Um numero apresentado como
 * QI teria que vir de instrumento normatizado e aplicado por profissional; o
 * que existe aqui e uma descricao de como a pessoa se saiu neste teste, neste
 * dia.
 *
 * TAMBEM NAO EXISTE PERCENTIL. Enquanto nao houver amostra medida, comparar
 * seria inventar — e a comparacao e justamente o que a pessoa mais quer ler.
 * Por isso a ausencia e dita, com o motivo, em vez de omitida.
 */

export type SecaoId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6';

/** Como um resultado por dimensao e lido. Tres faixas, e nada entre elas. */
export type FaixaDimensao = 'alto' | 'medio' | 'baixo';

/**
 * O encontro entre ritmo e precisao.
 *
 * Interessa porque as duas leituras opostas do mesmo acerto sao verdadeiras:
 * quem acerta devagar pode estar conferindo, e quem erra rapido pode estar
 * decidindo cedo demais. Dizer so "voce levou 18 minutos" nao ajuda ninguem.
 */
export type Ritmo = 'rapidoPreciso' | 'rapidoImpreciso' | 'lentoPreciso' | 'lentoImpreciso';

export interface SecaoRelatorio {
  id: SecaoId;
  /** Chave sob `iq_report.<id>`, escolhida pelos dados. */
  corpoKey: string;
  params?: Record<string, string | number>;
}

export interface LeituraDimensao extends ScoreDimensao {
  faixa: FaixaDimensao;
  /** Verdadeiro quando esta entre os dois melhores ou os dois piores. */
  destaque: 'forte' | 'fraco' | null;
}

export interface IqReportPlan {
  scoringVersion: string;
  pontos: number;
  acertos: number;
  total: number;
  tempoTotal_ms: number;
  minutos: number;
  fatorVelocidade: number;
  ritmo: Ritmo;
  /** Nunca inventado: null enquanto nao houver amostra. */
  percentil: number | null;
  dimensoes: LeituraDimensao[];
  fortes: Dimensao[];
  fracos: Dimensao[];
  secoes: SecaoRelatorio[];
}

/**
 * Cortes das faixas por dimensao.
 *
 * Sao percentuais de acerto dentro da dimensao, nao percentis populacionais —
 * de novo, nao ha populacao. Os cortes sao generosos de proposito: um bloco de
 * cinco a oito itens tem margem de erro grande, e chamar de "baixo" quem errou
 * dois seria dar peso a um numero que nao aguenta.
 */
const CORTE_ALTO = 70;
const CORTE_BAIXO = 40;

export function faixaDe(percentual: number): FaixaDimensao {
  if (percentual >= CORTE_ALTO) return 'alto';
  if (percentual < CORTE_BAIXO) return 'baixo';
  return 'medio';
}

/**
 * Tempo de referencia do teste, em minutos.
 *
 * O banco foi montado para ser respondido nesta ordem e neste ritmo. Serve de
 * eixo para dizer "acima" ou "abaixo" sem prometer que exista um tempo certo.
 */
export const MINUTOS_REFERENCIA = 18;

export function ritmoDe(minutos: number, acertos: number, total: number): Ritmo {
  const preciso = total > 0 && acertos / total >= 0.6;
  const rapido = minutos <= MINUTOS_REFERENCIA;
  if (rapido) return preciso ? 'rapidoPreciso' : 'rapidoImpreciso';
  return preciso ? 'lentoPreciso' : 'lentoImpreciso';
}

/** Como a pontuacao se posiciona contra o centro da escala. */
function faixaDaPontuacao(pontos: number): 'acima' | 'centro' | 'abaixo' {
  if (pontos >= BASE + 10) return 'acima';
  if (pontos <= BASE - 10) return 'abaixo';
  return 'centro';
}

/**
 * Monta o plano a partir do resultado gravado.
 *
 * Puro: recebe o resultado e devolve o plano. Nao le banco, nao formata data,
 * nao sabe idioma — o que permite testar a regra sem subir nada.
 */
export function buildIqReportPlan(result: IqResult): IqReportPlan {
  const minutos = Math.max(1, Math.round(result.tempoTotal_ms / 60000));
  const ritmo = ritmoDe(minutos, result.acertos, result.total);

  const fortes = result.pontosFortes.slice(0, 2);
  const fracos = result.pontosFracos.slice(0, 2);

  const dimensoes: LeituraDimensao[] = result.perfil.map((d) => ({
    ...d,
    faixa: faixaDe(d.percentual),
    destaque: fortes.includes(d.dimensao) ? 'forte' : fracos.includes(d.dimensao) ? 'fraco' : null,
  }));

  /**
   * A DISTANCIA ENTRE O MELHOR E O PIOR EIXO diz mais do que qualquer eixo
   * sozinho. Um perfil parelho e uma pessoa que responde igual em tudo; um
   * perfil torto e alguem com uma forma marcada de pensar. As duas leituras
   * sao uteis, e sao diferentes.
   */
  const percentuais = dimensoes.map((d) => d.percentual);
  const amplitude = Math.round(Math.max(...percentuais) - Math.min(...percentuais));
  const perfilForma = amplitude >= 40 ? 'irregular' : amplitude >= 20 ? 'misto' : 'parelho';

  const secoes: SecaoRelatorio[] = [
    { id: 'q1', corpoKey: 'corpo' },
    {
      id: 'q2',
      corpoKey: faixaDaPontuacao(result.pontos),
      params: { pontos: result.pontos, acertos: result.acertos, total: result.total },
    },
    { id: 'q3', corpoKey: perfilForma, params: { amplitude } },
    {
      id: 'q4',
      corpoKey: fortes.length >= 2 ? 'doisEixos' : 'umEixo',
      params: { amplitude },
    },
    {
      id: 'q5',
      corpoKey: ritmo,
      params: { minutos, referencia: MINUTOS_REFERENCIA, acertos: result.acertos, total: result.total },
    },
    { id: 'q6', corpoKey: 'corpo' },
  ];

  return {
    scoringVersion: result.scoringVersion,
    pontos: result.pontos,
    acertos: result.acertos,
    total: result.total,
    tempoTotal_ms: result.tempoTotal_ms,
    minutos,
    fatorVelocidade: result.fatorVelocidade,
    ritmo,
    percentil: result.percentil,
    dimensoes,
    fortes,
    fracos,
    secoes,
  };
}
