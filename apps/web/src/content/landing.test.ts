import { describe, expect, it } from 'vitest';
import { ASSESSMENTS, reportIsSellable } from './landing';

/**
 * A regra que decide se ha o que vender.
 *
 * Ela e lida pelas duas rotas de pagamento antes de qualquer chamada ao
 * Stripe, entao um engano aqui vira uma cobranca por um relatorio que nao
 * existe — que foi exatamente o estado do teste de QI ate agora.
 */
describe('reportIsSellable', () => {
  it('libera o TDAH e segura o QI', () => {
    // O QI e pontuado e guardado, mas `ReportView` so conhece os dominios da
    // ASRS: quem pagasse receberia o relatorio do TDAH com as perguntas
    // erradas. As rotas de pagamento leem exatamente esta funcao.
    expect(reportIsSellable('attention')).toBe(true);
    expect(reportIsSellable('cognition')).toBe(false);
  });

  it('recusa o que nao conhece', () => {
    expect(reportIsSellable('inexistente')).toBe(false);
    expect(reportIsSellable('')).toBe(false);
  });

  it('so marca reportReady onde ha relatorio escrito', () => {
    for (const a of ASSESSMENTS) {
      if (a.reportReady) expect(a.available, `${a.id} vende sem estar disponivel`).toBe(true);
    }
  });
});
