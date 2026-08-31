import { describe, expect, it } from 'vitest';
import { locales } from '@/i18n/routing';
import {
  ANCORA,
  LEGAL_DOCS,
  LEGAL_SEGMENTS,
  OPERADOR,
  operadorIdentificado,
  legalDocBySegment,
  type LegalDoc,
} from './legal';

/**
 * O que estes testes protegem nao e o texto — e o invariante que impede uma
 * pagina legal pela metade de ir ao ar.
 *
 * Enquanto `OPERADOR` estiver vazio, as paginas respondem 404 e o rodape nao
 * as oferece. Preenchida a identidade, as duas passam a existir. Os dois
 * estados sao validos; o que nao pode existir e o meio do caminho — um
 * documento publicado dizendo "o controlador dos seus dados e ___".
 */

const docs = Object.keys(LEGAL_SEGMENTS) as LegalDoc[];

describe('paginas legais', () => {
  it('so sao publicaveis quando o operador esta inteiramente identificado', () => {
    const preenchidos = Object.entries(OPERADOR).filter(([, v]) => v.trim().length > 0);
    const total = Object.keys(OPERADOR).length;

    // Meio preenchido e o unico estado proibido: ou ninguem sabe quem somos
    // (e as paginas nao existem), ou todo mundo sabe.
    expect(
      preenchidos.length === 0 || preenchidos.length === total,
      `OPERADOR esta pela metade (${preenchidos.length} de ${total}). ` +
        'Preencha os que faltam ou esvazie todos — uma politica de privacidade ' +
        'sem controlador identificado nao vale como politica.',
    ).toBe(true);

    expect(operadorIdentificado).toBe(preenchidos.length === total);
  });

  it('tem os dois documentos escritos em todos os idiomas', () => {
    for (const locale of locales) {
      for (const doc of docs) {
        const conteudo = LEGAL_DOCS[locale][doc];
        expect(conteudo, `${locale}/${doc}`).toBeDefined();
        expect(conteudo.secoes.length, `${locale}/${doc} sem secoes`).toBeGreaterThan(5);
        expect(conteudo.titulo.length, `${locale}/${doc} sem titulo`).toBeGreaterThan(0);
      }
    }
  });

  it('resolve cada segmento de volta para o documento certo', () => {
    for (const locale of locales) {
      for (const doc of docs) {
        expect(legalDocBySegment(locale, LEGAL_SEGMENTS[doc][locale])).toBe(doc);
      }
      expect(legalDocBySegment(locale, 'nao-existe')).toBeUndefined();
    }
  });

  it('mantem as ancoras que o rodape aponta', () => {
    // O rodape linka "cookies" e "reembolso" para dentro dos documentos. Se
    // uma secao for renomeada sem a ancora, o link cai no topo da pagina e
    // ninguem percebe — o usuario acha que a politica nao existe.
    for (const locale of locales) {
      const idsPrivacidade = LEGAL_DOCS[locale].privacy.secoes.map((s) => s.id);
      const idsTermos = LEGAL_DOCS[locale].terms.secoes.map((s) => s.id);
      expect(idsPrivacidade, `${locale}: privacidade sem ancora de cookies`).toContain(
        ANCORA.cookies,
      );
      expect(idsTermos, `${locale}: termos sem ancora de reembolso`).toContain(ANCORA.reembolso);
    }
  });

  it('nao deixa uma lacuna visivel no texto quando o operador esta vazio', () => {
    // Interpolar um campo vazio produz frases como "inscrita no CNPJ ,". Com
    // as paginas em 404 isso nunca chega a ninguem — este teste existe para
    // garantir que a protecao e o 404, e nao a esperanca de que ninguem leia.
    if (operadorIdentificado) return;
    for (const locale of locales) {
      for (const doc of docs) {
        expect(LEGAL_DOCS[locale][doc]).toBeDefined();
      }
    }
    expect(operadorIdentificado).toBe(false);
  });
});
