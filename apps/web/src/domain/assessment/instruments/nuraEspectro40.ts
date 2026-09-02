import type { AssessmentDefinition } from '../types';

/**
 * Escala NURA de tracos do espectro — 40 itens.
 *
 * NAO E UM INSTRUMENTO VALIDADO, e o texto diz isso em toda tela onde o
 * resultado aparece. A diferenca em relacao ao teste de TDAH e deliberada e
 * precisa ser entendida por quem mexer aqui: la o instrumento e a ASRS-v1.1,
 * da Organizacao Mundial da Saude, com ponto de corte publicado e populacao de
 * validacao conhecida — por isso o resultado pode dizer "acima do ponto de
 * corte do instrumento". Aqui nao existe ponto de corte publicado, porque a
 * escala e nossa.
 *
 * POR QUE NAO USAMOS O AQ. O Autism Spectrum Quotient (Baron-Cohen et al.,
 * 2001) seria o candidato natural, e e o que praticamente todo teste online do
 * genero deriva. Mas ele pertence ao Autism Research Centre, que libera uso
 * para pesquisa nao comercial — e a NURA cobra pelo relatorio. Copiar os itens
 * de um concorrente que ja derivou do AQ herdaria o mesmo problema com uma
 * camada a mais. Entao os itens sao escritos por nos, cobrindo os mesmos
 * territorios que a literatura descreve, e a escala se apresenta como o que e.
 *
 * O QUE ISSO CUSTA, dito aqui porque e onde alguem vai ler antes de prometer
 * algo em publicidade: sem estudo de validacao, esta escala nao tem
 * sensibilidade nem especificidade conhecidas. Ela organiza uma
 * autoobservacao. Nao mede prevalencia, nao separa quem tem de quem nao tem, e
 * qualquer texto que sugira o contrario esta errado.
 *
 * QUATRO TERRITORIOS, dez itens cada, na divisao que a literatura usa para
 * descrever o espectro: comunicacao social, rotina e repeticao, sensorial, e
 * foco e detalhe. Sao subescalas descritivas — dizem onde os tracos aparecem,
 * nao quanto de cada um alguem "tem".
 *
 * SEIS ITENS SAO INVERTIDOS (`reversed`). Concordar com eles indica AUSENCIA
 * do traco. Existem contra o vies de aquiescencia: num questionario de 40
 * itens todos na mesma direcao, quem marca "concordo" por habito termina com
 * pontuacao alta que nao mede nada. Estao espalhados de proposito, e a
 * inversao acontece em `valueOf` — nenhuma regra aqui precisa saber disso.
 */

const SCALE_ID = 'agreement5';

/** Comunicacao social e reciprocidade. */
export const COMUNICACAO = [
  'esp-05',
  'esp-09',
  'esp-21',
  'esp-22',
  'esp-23',
  'esp-26',
  'esp-31',
  'esp-34',
  'esp-37',
  'esp-24',
] as const;

/** Rotina, previsibilidade e repeticao. */
export const ROTINA = [
  'esp-01',
  'esp-10',
  'esp-11',
  'esp-14',
  'esp-19',
  'esp-20',
  'esp-29',
  'esp-36',
  'esp-38',
  'esp-32',
] as const;

/** Processamento sensorial. */
export const SENSORIAL = [
  'esp-03',
  'esp-06',
  'esp-12',
  'esp-16',
  'esp-17',
  'esp-27',
  'esp-28',
  'esp-33',
  'esp-39',
  'esp-13',
] as const;

/** Foco, detalhe e estilo de pensamento. */
export const FOCO = [
  'esp-02',
  'esp-04',
  'esp-07',
  'esp-08',
  'esp-15',
  'esp-18',
  'esp-25',
  'esp-30',
  'esp-35',
  'esp-40',
] as const;

export const ESPECTRO_DOMINIOS = {
  comunicacao: COMUNICACAO,
  rotina: ROTINA,
  sensorial: SENSORIAL,
  foco: FOCO,
} as const;

export type EspectroDominio = keyof typeof ESPECTRO_DOMINIOS;

/**
 * Itens redigidos na direcao contraria.
 *
 * Escolhidos entre os temas que admitem uma formulacao invertida sem ficar
 * artificial — trocar a direcao de "sobrecarga em lugares movimentados" daria
 * uma frase que ninguem diria em voz alta.
 */
const INVERTIDOS = new Set(['esp-05', 'esp-13', 'esp-24', 'esp-32', 'esp-34', 'esp-40']);

const TODOS = [...COMUNICACAO, ...ROTINA, ...SENSORIAL, ...FOCO];

/**
 * A partir de qual resposta um item conta como presente.
 *
 * Tres em cinco — "concordo" — para todos, sem excecao por item. Isto e outra
 * diferenca honesta em relacao a ASRS, onde o limiar muda de questao para
 * questao porque o instrumento publicado define assim, item a item. Inventar
 * limiares diferentes aqui seria dar aparencia de calibragem a uma escolha
 * que nao tem estudo por tras.
 */
const LIMIAR = 3;
const positiveAt = Object.fromEntries(TODOS.map((id) => [id, LIMIAR]));

export const nuraEspectro40: AssessmentDefinition = {
  assessmentId: 'autism',
  version: 'nura-espectro-40/1.0',
  scoringVersion: 'esp-2026-09a',

  provenance: {
    instrument: 'Escala NURA de traços do espectro (40 itens)',
    authors: 'NURA',
    licence: 'Própria',
    // Lido na tela pelo que ele diz. Nao ha estudo de validacao, e a frase
    // existe para que isso apareca onde a pessoa decide o quanto confiar.
    validatedFor:
      'Adultos. Escala própria, sem estudo de validação — organiza uma autoobservação e não substitui avaliação clínica.',
  },

  scales: [
    {
      id: SCALE_ID,
      choices: [
        { id: 'strongly-disagree', value: 0 },
        { id: 'disagree', value: 1 },
        { id: 'neutral', value: 2 },
        { id: 'agree', value: 3 },
        { id: 'strongly-agree', value: 4 },
      ],
    },
  ],

  questions: TODOS.map((id) => ({
    id,
    type: 'likert' as const,
    block: 'espectro',
    scaleId: SCALE_ID,
    ...(INVERTIDOS.has(id) ? { reversed: true } : {}),
  })),

  rules: [
    /**
     * A contagem geral, e as faixas que ela produz.
     *
     * OS CORTES NAO SAO PONTO DE CORTE CLINICO. Sao tres faixas descritivas
     * sobre quantos dos 40 territorios a pessoa reconheceu em si, e o texto
     * que acompanha cada uma nunca diz "voce tem" nem "voce nao tem". A faixa
     * mais alta convida a procurar avaliacao; a mais baixa diz explicitamente
     * que nao descarta nada.
     */
    {
      kind: 'threshold-count',
      id: 'espectro-total',
      questionIds: [...TODOS],
      positiveAt,
      cutoff: 20,
      bands: [
        { from: 0, to: 9, key: 'poucos' },
        { from: 10, to: 19, key: 'alguns' },
        { from: 20, to: 40, key: 'muitos' },
      ],
    },

    // Subescalas descritivas: dizem onde os tracos apareceram, sem verdito.
    { kind: 'sum', id: 'comunicacao', questionIds: [...COMUNICACAO] },
    { kind: 'sum', id: 'rotina', questionIds: [...ROTINA] },
    { kind: 'sum', id: 'sensorial', questionIds: [...SENSORIAL] },
    { kind: 'sum', id: 'foco', questionIds: [...FOCO] },

    // Quais itens cada dominio reconheceu, para o relatorio citar.
    { kind: 'flagged-items', id: 'comunicacao-itens', questionIds: [...COMUNICACAO], positiveAt },
    { kind: 'flagged-items', id: 'rotina-itens', questionIds: [...ROTINA], positiveAt },
    { kind: 'flagged-items', id: 'sensorial-itens', questionIds: [...SENSORIAL], positiveAt },
    { kind: 'flagged-items', id: 'foco-itens', questionIds: [...FOCO], positiveAt },
  ],
};

/** Ordem de apresentacao: os quatro territorios intercalados. */
export const ESPECTRO_ORDEM: string[] = (() => {
  const listas = [COMUNICACAO, ROTINA, SENSORIAL, FOCO];
  const saida: string[] = [];
  for (let i = 0; i < 10; i++) for (const lista of listas) saida.push(lista[i]);
  return saida;
})();
