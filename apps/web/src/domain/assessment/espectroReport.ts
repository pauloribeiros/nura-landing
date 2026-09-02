import type { ScoreResult } from './types';
import { ESPECTRO_DOMINIOS, type EspectroDominio } from './instruments/nuraEspectro40';

/**
 * O plano do relatorio pago da escala do espectro.
 *
 * Mesma divisao dos outros dois: aqui se decide O QUE dizer a partir dos
 * dados, e o catalogo de mensagens guarda COMO dizer.
 *
 * O QUE ESTE RELATORIO NAO FAZ e afirmar um diagnostico, nem sugerir que a
 * pontuacao caminha para um. Nao ha ponto de corte clinico porque a escala e
 * nossa e nao passou por validacao, e o texto repete isso onde a pessoa vai
 * procurar uma resposta fechada — no comeco e no fim.
 *
 * A ESTRUTURA E POR TERRITORIO, e nao por gravidade. Quatro secoes de conteudo
 * — comunicacao, rotina, sensorial, foco — cada uma lida a partir de quantos
 * itens daquele territorio a pessoa reconheceu. Um relatorio organizado por
 * "o que esta pior" transformaria uma descricao num ranking de defeitos; um
 * organizado por territorio devolve um mapa.
 */

export type SecaoEspectroId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6';

/** Quanto de um territorio a pessoa reconheceu. Tres faixas, nada entre elas. */
export type FaixaDominio = 'forte' | 'parcial' | 'leve';

export interface LeituraDominio {
  dominio: EspectroDominio;
  reconhecidos: number;
  total: number;
  faixa: FaixaDominio;
}

export interface SecaoEspectro {
  id: SecaoEspectroId;
  /** Chave sob `espectro_report.<id>`, escolhida pelos dados. */
  corpoKey: string;
  params?: Record<string, string | number>;
  /** O territorio que a secao le, quando ela le um. */
  dominio?: EspectroDominio;
}

export interface EspectroReportPlan {
  scoringVersion: string;
  total: number;
  maximo: number;
  faixa: string;
  dominios: LeituraDominio[];
  /** O territorio com mais itens reconhecidos. */
  maior: EspectroDominio;
  /** O com menos. */
  menor: EspectroDominio;
  /** Distancia entre o maior e o menor, em itens. */
  amplitude: number;
  secoes: SecaoEspectro[];
}

/**
 * Cortes por territorio, em itens reconhecidos de dez.
 *
 * Generosos de proposito. Um bloco de dez itens tem margem de erro grande, e
 * chamar de "leve" quem reconheceu tres seria dar peso a um numero que nao
 * aguenta esse peso.
 */
export function faixaDominio(reconhecidos: number, total: number): FaixaDominio {
  const parte = total === 0 ? 0 : reconhecidos / total;
  if (parte >= 0.7) return 'forte';
  if (parte >= 0.4) return 'parcial';
  return 'leve';
}

export function buildEspectroReportPlan(result: ScoreResult): EspectroReportPlan {
  const dominios: LeituraDominio[] = (Object.keys(ESPECTRO_DOMINIOS) as EspectroDominio[]).map(
    (dominio) => {
      const total = ESPECTRO_DOMINIOS[dominio].length;
      const reconhecidos = (result.flagged[`${dominio}-itens`] ?? []).length;
      return { dominio, reconhecidos, total, faixa: faixaDominio(reconhecidos, total) };
    },
  );

  const ordenados = [...dominios].sort((a, b) => b.reconhecidos - a.reconhecidos);
  const maior = ordenados[0];
  const menor = ordenados[ordenados.length - 1];
  const amplitude = maior.reconhecidos - menor.reconhecidos;

  const total = result.scores['espectro-total'] ?? 0;
  const faixa = result.bands['espectro-total'] ?? 'poucos';

  /**
   * A FORMA DO PERFIL diz coisa diferente da altura dele. Alguem com traços
   * concentrados num territorio vive algo diferente de alguem com traços
   * espalhados por todos — mesmo somando o mesmo total.
   */
  const forma = amplitude >= 5 ? 'concentrado' : amplitude >= 3 ? 'irregular' : 'espalhado';

  const secaoDe = (id: SecaoEspectroId, dominio: EspectroDominio): SecaoEspectro => {
    const leitura = dominios.find((d) => d.dominio === dominio)!;
    return {
      id,
      dominio,
      corpoKey: leitura.faixa,
      params: { reconhecidos: leitura.reconhecidos, total: leitura.total },
    };
  };

  return {
    scoringVersion: result.scoringVersion,
    total,
    maximo: dominios.reduce((soma, d) => soma + d.total, 0),
    faixa,
    dominios,
    maior: maior.dominio,
    menor: menor.dominio,
    amplitude,
    secoes: [
      { id: 's1', corpoKey: faixa, params: { total, maximo: 40 } },
      secaoDe('s2', 'comunicacao'),
      secaoDe('s3', 'rotina'),
      secaoDe('s4', 'sensorial'),
      secaoDe('s5', 'foco'),
      { id: 's6', corpoKey: forma, params: { amplitude } },
    ],
  };
}
