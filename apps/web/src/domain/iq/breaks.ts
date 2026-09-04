/**
 * Depois de quantas RESPOSTAS aparece uma tela de progressao.
 *
 * MORA NO DOMINIO, E NAO NO COMPONENTE, porque nao e uma decisao de tela: e uma
 * propriedade da corrida, do mesmo tipo que a ordem dos itens. Enquanto vivia
 * dentro de um `.tsx`, um teste de dominio nao conseguia sequer importa-la —
 * e a posicao de um item que depende de onde cai a pausa ficava sem como ser
 * verificada.
 *
 * Contado em respostas e nao em telas: a corrida tem mais telas do que itens,
 * porque o estimulo de memoria e uma tela que ninguem responde, e uma pausa
 * que caisse entre o estimulo e a cobranca ficaria no meio da interferencia
 * que ela mesma existe para medir.
 */
export const BREAKS: { after: number; variant: 'start' | 'middle' | 'end' }[] = [
  { after: 12, variant: 'start' },
  { after: 24, variant: 'middle' },
  { after: 36, variant: 'end' },
];
