import { describe, expect, it } from 'vitest';
import en from '../../../../messages/en.json';
import es from '../../../../messages/es.json';
import ptBr from '../../../../messages/pt-br.json';
import { scoreAssessment } from '../scoring';
import {
  ESPECTRO_DOMINIOS,
  ESPECTRO_ORDEM,
  nuraEspectro40,
  type EspectroDominio,
} from './nuraEspectro40';

const CATALOGOS = { 'pt-br': ptBr, en, es } as Record<string, Record<string, unknown>>;
const IDS = nuraEspectro40.questions.map((q) => q.id);

function responder(valor: string) {
  return IDS.map((questionId) => ({ questionId, choiceId: valor }));
}

describe('escala do espectro: forma do instrumento', () => {
  it('tem 40 itens, todos unicos', () => {
    expect(IDS).toHaveLength(40);
    expect(new Set(IDS).size).toBe(40);
  });

  it('divide os 40 em quatro dominios de dez, sem sobra nem repeticao', () => {
    const dominios = Object.keys(ESPECTRO_DOMINIOS) as EspectroDominio[];
    const juntos = dominios.flatMap((d) => [...ESPECTRO_DOMINIOS[d]]);
    for (const d of dominios) expect(ESPECTRO_DOMINIOS[d], d).toHaveLength(10);
    expect(new Set(juntos).size).toBe(40);
    expect([...juntos].sort()).toEqual([...IDS].sort());
  });

  it('apresenta os quatro territorios intercalados', () => {
    // Dez itens seguidos do mesmo assunto cansam e induzem resposta em bloco.
    expect(ESPECTRO_ORDEM).toHaveLength(40);
    expect(new Set(ESPECTRO_ORDEM).size).toBe(40);
    const dominioDe = (id: string) =>
      (Object.keys(ESPECTRO_DOMINIOS) as EspectroDominio[]).find((d) =>
        (ESPECTRO_DOMINIOS[d] as readonly string[]).includes(id),
      );
    for (let i = 1; i < ESPECTRO_ORDEM.length; i++) {
      expect(dominioDe(ESPECTRO_ORDEM[i]), `${ESPECTRO_ORDEM[i]} repete o dominio anterior`).not.toBe(
        dominioDe(ESPECTRO_ORDEM[i - 1]),
      );
    }
  });

  it('tem itens invertidos, e nao poucos demais para servir', () => {
    // Sem eles, quem marca "concordo" em tudo por habito termina no topo.
    const invertidos = nuraEspectro40.questions.filter((q) => q.reversed);
    expect(invertidos.length).toBeGreaterThanOrEqual(5);
    expect(invertidos.length).toBeLessThan(IDS.length / 2);
  });

  it('nao se apresenta como instrumento validado', () => {
    // A frase e lida na tela. Se alguem trocar por algo que sugira validacao,
    // o teste cai — e essa e a intencao.
    const { provenance } = nuraEspectro40;
    expect(provenance.authors).toBe('NURA');
    expect(provenance.validatedFor.toLowerCase()).toContain('sem estudo de validação');
  });
});

describe('escala do espectro: pontuacao', () => {
  it('concordar com tudo NAO leva a contagem maxima, por causa dos invertidos', () => {
    // E o ponto inteiro da inversao: aquiescencia deixa de produzir 40 de 40.
    const r = scoreAssessment(nuraEspectro40, responder('strongly-agree'));
    const invertidos = nuraEspectro40.questions.filter((q) => q.reversed).length;
    expect(r.scores['espectro-total']).toBe(40 - invertidos);
    expect(r.bands['espectro-total']).toBe('muitos');
  });

  it('discordar de tudo conta apenas os invertidos', () => {
    const r = scoreAssessment(nuraEspectro40, responder('strongly-disagree'));
    const invertidos = nuraEspectro40.questions.filter((q) => q.reversed).length;
    expect(r.scores['espectro-total']).toBe(invertidos);
  });

  it('o meio da escala nao conta como presenca', () => {
    // "Nem concordo nem discordo" vale 2, abaixo do limiar de 3.
    const r = scoreAssessment(nuraEspectro40, responder('neutral'));
    expect(r.scores['espectro-total']).toBe(0);
    expect(r.bands['espectro-total']).toBe('poucos');
  });

  it('produz as tres faixas nos cortes', () => {
    const faixaCom = (quantos: number) => {
      const naoInvertidos = nuraEspectro40.questions.filter((q) => !q.reversed).map((q) => q.id);
      const respostas = IDS.map((questionId) => ({
        questionId,
        choiceId:
          naoInvertidos.indexOf(questionId) > -1 && naoInvertidos.indexOf(questionId) < quantos
            ? 'strongly-agree'
            : 'neutral',
      }));
      return scoreAssessment(nuraEspectro40, respostas);
    };
    expect(faixaCom(5).bands['espectro-total']).toBe('poucos');
    expect(faixaCom(15).bands['espectro-total']).toBe('alguns');
    expect(faixaCom(25).bands['espectro-total']).toBe('muitos');
  });

  it('marca os itens reconhecidos em cada dominio', () => {
    const r = scoreAssessment(nuraEspectro40, responder('strongly-agree'));
    for (const d of Object.keys(ESPECTRO_DOMINIOS) as EspectroDominio[]) {
      const marcados = r.flagged[`${d}-itens`] ?? [];
      const invertidosNoDominio = (ESPECTRO_DOMINIOS[d] as readonly string[]).filter(
        (id) => nuraEspectro40.questions.find((q) => q.id === id)?.reversed,
      ).length;
      expect(marcados, d).toHaveLength(10 - invertidosNoDominio);
    }
  });
});

describe('escala do espectro: catalogo', () => {
  for (const [locale, catalogo] of Object.entries(CATALOGOS)) {
    it(`${locale} tem os 40 enunciados e os cinco rotulos`, () => {
      const ns = catalogo.espectro as Record<string, Record<string, string>> | undefined;
      expect(ns, `${locale} nao tem o namespace espectro`).toBeDefined();

      const faltando = IDS.filter((id) => typeof ns!.prompts?.[id] !== 'string');
      expect(faltando, `${locale}: enunciados ausentes`).toEqual([]);

      const escala = nuraEspectro40.scales[0].choices.map((c) => c.id);
      const semRotulo = escala.filter((id) => typeof ns!.choices?.[id] !== 'string');
      expect(semRotulo, `${locale}: rotulos ausentes`).toEqual([]);

      expect(typeof ns!.poles?.low, locale).toBe('string');
      expect(typeof ns!.poles?.high, locale).toBe('string');
    });

    it(`${locale} nao deixa enunciado vazio nem duplicado`, () => {
      const ns = catalogo.espectro as Record<string, Record<string, string>>;
      const textos = IDS.map((id) => ns.prompts[id]);
      expect(textos.every((t) => t.trim().length > 10), `${locale}: enunciado curto demais`).toBe(true);
      expect(new Set(textos).size, `${locale}: enunciado repetido`).toBe(40);
    });
  }
});
