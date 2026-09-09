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
  it('libera as avaliacoes cujo relatorio existe', () => {
    // O QI ficou fora da venda enquanto `ReportView` so conhecia os dominios
    // da ASRS — quem pagasse receberia o relatorio do TDAH com as perguntas
    // erradas. Com `IqReportView` e o plano proprio, ele voltou. O espectro
    // entrou pelo mesmo caminho: plano proprio, view propria e o ramo em
    // `loadReport` antes de a cobranca abrir.
    expect(reportIsSellable('attention')).toBe(true);
    expect(reportIsSellable('cognition')).toBe(true);
    expect(reportIsSellable('autism')).toBe(true);
  });

  it('segura o que ainda nao tem relatorio escrito', () => {
    // Altas habilidades ainda nao existe como teste, quanto mais como
    // relatorio. Enquanto `available` for falso, isto tem de continuar falso.
    expect(reportIsSellable('giftedness')).toBe(false);
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
