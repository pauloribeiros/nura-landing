import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import es from '../../messages/es.json';
import ptBr from '../../messages/pt-br.json';
import { ASSESSMENTS, reportIsSellable } from './landing';

/**
 * O que a tela de pagamento promete, por avaliacao.
 *
 * A lista de "o que voce recebe" e a UNICA descricao do produto que a pessoa
 * le antes de pagar. Ela era escolhida por um ternario com um `else` generico,
 * e o generico descreve o relatorio de raciocinio — "o perfil nas seis
 * dimensoes". Quando o espectro entrou a venda, ele caiu nesse `else` e passou
 * a prometer seis dimensoes que o relatorio dele nao tem. Nada apontou.
 *
 * Este teste amarra as duas pontas: toda avaliacao a venda precisa da propria
 * familia de chaves, nos tres idiomas.
 */

const CATALOGOS: Record<string, Record<string, unknown>> = { 'pt-br': ptBr, en, es };

/** O prefixo das chaves de cada avaliacao, como a rota escolhe. */
const FAMILIA: Record<string, string> = {
  attention: 'atencao',
  autism: 'espectro',
  cognition: 'inclui',
};

describe('o que a tela de pagamento promete', () => {
  it('toda avaliacao a venda tem a propria lista, e nao a de outra', () => {
    const aVenda = ASSESSMENTS.filter((a) => reportIsSellable(a.id));
    expect(aVenda.length).toBeGreaterThan(0);

    for (const a of aVenda) {
      const familia = FAMILIA[a.id];
      expect(
        familia,
        `"${a.id}" esta a venda e nao tem familia de chaves: vai cair na lista de outra avaliacao`,
      ).toBeDefined();

      for (const [locale, catalogo] of Object.entries(CATALOGOS)) {
        const ck = catalogo.iq_checkout as Record<string, string>;
        for (let i = 1; i <= 4; i += 1) {
          expect(
            typeof ck[`${familia}${i}`],
            `${locale}: falta iq_checkout.${familia}${i} (avaliacao ${a.id})`,
          ).toBe('string');
        }
      }
    }
  });

  it('as listas nao sao a mesma coisa com outro nome', () => {
    // Se duas avaliacoes descrevem exatamente o mesmo produto, uma delas esta
    // usando o texto da outra — que e o defeito que este arquivo existe para
    // impedir. As duas ultimas linhas SAO iguais de proposito (e-mail e
    // acesso), entao a comparacao e so das duas primeiras.
    const ck = ptBr.iq_checkout as Record<string, string>;
    const assinatura = (familia: string) => `${ck[`${familia}1`]}|${ck[`${familia}2`]}`;
    const vistas = new Map<string, string>();
    for (const [id, familia] of Object.entries(FAMILIA)) {
      const s = assinatura(familia);
      const dono = vistas.get(s);
      expect(dono, `"${id}" promete o mesmo que "${dono}"`).toBeUndefined();
      vistas.set(s, id);
    }
  });
});
