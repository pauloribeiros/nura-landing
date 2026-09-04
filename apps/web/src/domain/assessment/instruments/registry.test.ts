import { describe, expect, it } from 'vitest';
import { ASSESSMENTS } from '../../../content/landing';
import { INSTRUMENTS, instrumentoDe } from './registry';

/**
 * O buraco que este arquivo fecha.
 *
 * O teste do espectro autista foi ao ar completo: 40 itens, tres idiomas,
 * pontuacao testada, telas de progresso. So que o instrumento nunca foi
 * registrado na rota que pontua. A pessoa respondia as 40 perguntas, a rota
 * devolvia `unknown-assessment`, nenhum resultado era gravado — e a pagina de
 * pagamento, que exige um resultado, respondia 404.
 *
 * Nenhum teste pegou porque o registro era uma constante dentro de um
 * `route.ts`, fora do alcance de qualquer um deles. A licao nao e "faltou um
 * teste": e que uma ponta solta entre duas partes testadas nao aparece em
 * nenhuma das duas.
 */

/**
 * O QI e a excecao declarada: banco, pontuacao e rota proprios
 * (`/api/iq/score`), porque ele mede acerto contra gabarito e nao uma escala
 * de respostas. Qualquer OUTRA avaliacao que esteja no ar tem de estar aqui.
 */
const FORA_DESTA_ROTA = new Set(['cognition']);

describe('registro de instrumentos', () => {
  it('TODA avaliacao no ar tem como ser pontuada', () => {
    const noAr = ASSESSMENTS.filter((a) => a.available && !FORA_DESTA_ROTA.has(a.id));
    expect(noAr.length, 'ninguem no ar? o filtro esta errado').toBeGreaterThan(0);

    for (const a of noAr) {
      expect(
        instrumentoDe(a.id),
        `"${a.id}" esta disponivel mas nenhum instrumento responde por ele: ` +
          'o teste vai ao ar, a pontuacao falha no fim e o checkout responde 404',
      ).toBeDefined();
    }
  });

  it('cada instrumento responde pelo proprio id', () => {
    // Uma chave que nao bate com o `assessmentId` seria um instrumento
    // inalcancavel: a rota procura pelo id da sessao, nao pela chave.
    for (const [chave, definicao] of Object.entries(INSTRUMENTS)) {
      expect(definicao.assessmentId).toBe(chave);
    }
  });

  it('nao registra avaliacao que ainda nao existe na vitrine', () => {
    const conhecidas = new Set(ASSESSMENTS.map((a) => a.id));
    for (const chave of Object.keys(INSTRUMENTS)) {
      expect(conhecidas.has(chave), `"${chave}" nao esta no catalogo`).toBe(true);
    }
  });
});
