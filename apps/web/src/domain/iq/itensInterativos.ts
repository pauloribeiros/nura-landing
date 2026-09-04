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
 * O ENUNCIADO MORA NO BANCO, com o dos outros 44 itens, e as traducoes dele
 * nos mesmos `text.<locale>.json`. A primeira versao punha no catalogo de
 * mensagens por ser "texto de interface" — mas enunciado nao e interface, e
 * separar criava um item sem enunciado no banco, quebrando o invariante que
 * garante que toda questao tem o que perguntar. O que fica no catalogo sao os
 * rotulos da tela: relogio, contador, botoes.
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
  /** Em pt-br. Traducoes em `data/text.<locale>.json`, como os demais. */
  enunciado: string;
  /** Onde ele entra na ordem do teste. */
  ordem: number;
  /** Posicao fixa na trilha, se ele precisa aparecer cedo. Ver `Item.posicaoFixa`. */
  posicaoFixa?: number;
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
  ordem: 35,
  /* ELE ENTRA LOGO DEPOIS DA PRIMEIRA TELA DE PROGRESSAO, como 14a resposta.
     Na banda dele o item caia na questao 35 de 45 — quase ninguem chegava ali
     com atencao sobrando, e um formato que a pessoa nunca viu nao pode
     estrear no fim.
     O ponto exato nao e capricho. A primeira transicao aparece depois da 12a
     resposta e promete, com todas as letras, que "as proximas ficam mais
     dificeis". Uma questao comum vem em seguida, para a promessa nao virar
     truque de tela, e entao chega o desafio: e a promessa sendo cumprida, no
     momento em que a pessoa acabou de receber um balanco do proprio progresso.
     15 e nao 14 porque a contagem aqui e de ITENS e a da tela e de RESPOSTAS,
     e uma recordacao adiada de palavra ja passou entre as duas. */
  posicaoFixa: 15,
  enunciado: 'Ligue cada par de pontos da mesma cor. As linhas não podem se cruzar.',
  dimensao: 'orientacao_espacial',
  tipo: 'conectar_pares',
  dificuldade: 4,
  regra:
    'Tres pares (azul, amarelo, rosa) numa area 100x100. O par rosa cruza a ' +
    'area inteira e precisa ser tracado por fora dos outros dois; feito antes, ' +
    'ele isola o par amarelo. Bloqueio por cruzamento, 60s. Ocupa a ordem 35, ' +
    'que era do ESP-08 (dobradura em 4 camadas), aposentado por este.',
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

/**
 * Uma solucao sem cruzamento para cada item interativo.
 *
 * EXISTE PARA SER TESTADA, e nao para ser mostrada. Um item cujo unico caminho
 * cruza e impossivel de acertar, e ninguem descobriria isso olhando a tela —
 * so alguem travando nele durante os 60 segundos. O teste confere que este
 * caminho passa pela mesma regra que a tela aplica.
 *
 * No ESP-14, ligar os tres pares em linha reta NAO funciona: o traco rosa
 * atravessa o azul. E disso que o item trata — quem sai ligando descobre tarde.
 */
export const SOLUCOES: Record<string, { de: string; para: string; tracado: { x: number; y: number }[] }[]> = {
  'ESP-14': [
    { de: 'azul1', para: 'azul2', tracado: [{ x: 42, y: 8 }, { x: 44, y: 66 }] },
    { de: 'amar1', para: 'amar2', tracado: [{ x: 58, y: 52 }, { x: 60, y: 92 }] },
    // O rosa contorna por cima dos outros dois, que e a unica saida.
    {
      de: 'rosa1',
      para: 'rosa2',
      tracado: [
        { x: 8, y: 72 },
        { x: 4, y: 40 },
        { x: 4, y: 3 },
        { x: 96, y: 3 },
        { x: 96, y: 20 },
        { x: 92, y: 44 },
      ],
    },
  ],
};

export const ITENS_INTERATIVOS: ItemInterativo[] = [CONECTAR_PARES_01];

export const itemInterativoPorId = (id: string) =>
  ITENS_INTERATIVOS.find((item) => item.id === id);
