import type { ParCorreto, Ponto } from './conectarPares';

/**
 * Os itens interativos do teste de raciocinio.
 *
 * SAO SEPARADOS DO BANCO EM JSON porque a configuracao deles nao cabe la: o
 * banco guarda enunciado, alternativas e o indice da correta, e um item que se
 * responde desenhando nao tem alternativa nem indice. Ficar aqui tambem
 * significa que a config e tipada — um ponto sem cor ou um par apontando para
 * um id que nao existe param no compilador, e nao no meio do teste de alguem.
 *
 * O ENUNCIADO NAO MORA AQUI. Ele e traduzido como o resto, no catalogo de
 * mensagens, sob `iq.interativos.<id>`.
 */

export interface ConfigConectarPares {
  pontos: Ponto[];
  paresCorretos: ParCorreto[];
  /** Em segundos. */
  tempoLimite: number;
  iniciarAoTocar?: boolean;
}

export interface ItemInterativo {
  id: string;
  /** Onde ele entra na ordem do teste. */
  ordem: number;
  dimensao: 'orientacao_espacial';
  tipo: 'conectar_pares';
  dificuldade: 1 | 2 | 3 | 4 | 5;
  config: ConfigConectarPares;
  /** Documentacao interna da regra. NUNCA exibida. */
  regra: string;
}

/**
 * Ligar tres pares de pontos sem cruzar nenhuma linha.
 *
 * POR QUE ELE MEDE PLANEJAMENTO, e nao destreza: a configuracao abaixo tem
 * uma ordem de execucao que funciona e varias que travam. Ligar o par rosa
 * primeiro — o que atravessa a area toda — corta o caminho dos outros dois, e
 * a pessoa descobre isso quando ja nao da para desfazer sem perder tempo. Quem
 * olha antes de tracar termina; quem sai ligando, nao. E por isso que o
 * cruzamento e bloqueado na hora em vez de descontado no fim: a regra precisa
 * ser aprendida na primeira tentativa, nao no resultado.
 */
export const CONECTAR_PARES_01: ItemInterativo = {
  id: 'ESP-14',
  ordem: 33,
  dimensao: 'orientacao_espacial',
  tipo: 'conectar_pares',
  dificuldade: 4,
  regra:
    'Tres pares (azul, amarelo, rosa) numa area 100x100. O par rosa cruza a ' +
    'area inteira e precisa ser tracado por fora dos outros dois; feito antes, ' +
    'ele isola o par amarelo. Bloqueio por cruzamento, 60s.',
  config: {
    pontos: [
      { id: 'azul1', x: 42, y: 8, cor: '#2563eb' },
      { id: 'azul2', x: 44, y: 66, cor: '#2563eb' },
      { id: 'amar1', x: 58, y: 52, cor: '#eab308' },
      { id: 'amar2', x: 60, y: 92, cor: '#eab308' },
      { id: 'rosa1', x: 8, y: 72, cor: '#ec4899' },
      { id: 'rosa2', x: 92, y: 44, cor: '#ec4899' },
    ],
    paresCorretos: [
      ['azul1', 'azul2'],
      ['amar1', 'amar2'],
      ['rosa1', 'rosa2'],
    ],
    tempoLimite: 60,
    iniciarAoTocar: true,
  },
};

export const ITENS_INTERATIVOS: ItemInterativo[] = [CONECTAR_PARES_01];

export const itemInterativoPorId = (id: string) =>
  ITENS_INTERATIVOS.find((item) => item.id === id);
