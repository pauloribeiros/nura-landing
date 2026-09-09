import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';
import ptBr from '../../../messages/pt-br.json';
import { ASSESSMENTS, reportIsSellable } from '../../content/landing';
import { ESPECTRO_DOMINIOS, nuraEspectro40 } from './instruments/nuraEspectro40';
import { buildEspectroReportPlan, faixaDominio } from './espectroReport';
import type { ScoreResult } from './types';

/**
 * O relatorio pago da escala do espectro.
 *
 * O QUE ESTES TESTES PROTEGEM nao e a redacao — e o contrato entre o plano e o
 * catalogo. O plano escolhe uma chave a partir dos dados; se essa chave nao
 * existir em algum dos tres idiomas, a pagina quebra na hora em que alguem
 * abrir o relatorio que acabou de comprar. Nao ha momento pior.
 */

const CATALOGOS: Record<string, Record<string, unknown>> = { 'pt-br': ptBr, en, es };

function resultado(porDominio: Record<string, number>): ScoreResult {
  const flagged: Record<string, string[]> = {};
  let total = 0;
  for (const [dominio, quantos] of Object.entries(porDominio)) {
    const itens = ESPECTRO_DOMINIOS[dominio as keyof typeof ESPECTRO_DOMINIOS];
    flagged[`${dominio}-itens`] = itens.slice(0, quantos).map((i) => String(i));
    total += quantos;
  }
  return {
    assessmentId: 'autism',
    version: nuraEspectro40.version,
    scoringVersion: nuraEspectro40.scoringVersion,
    scores: { 'espectro-total': total },
    flags: {},
    flagged,
    bands: { 'espectro-total': total >= 26 ? 'muitos' : total >= 13 ? 'alguns' : 'poucos' },
    completeness: 1,
  };
}

const CENARIOS: Record<string, Record<string, number>> = {
  'nada reconhecido': { comunicacao: 0, rotina: 0, sensorial: 0, foco: 0 },
  'tudo reconhecido': { comunicacao: 10, rotina: 10, sensorial: 10, foco: 10 },
  'concentrado num territorio': { comunicacao: 9, rotina: 1, sensorial: 2, foco: 1 },
  'espalhado por igual': { comunicacao: 5, rotina: 5, sensorial: 4, foco: 5 },
  'irregular': { comunicacao: 7, rotina: 3, sensorial: 5, foco: 4 },
};

describe('plano do relatorio do espectro', () => {
  it('le cada territorio pelos itens reconhecidos', () => {
    const plano = buildEspectroReportPlan(resultado(CENARIOS['irregular']));
    const comunicacao = plano.dominios.find((d) => d.dominio === 'comunicacao')!;
    expect(comunicacao.reconhecidos).toBe(7);
    expect(comunicacao.total).toBe(10);
    expect(plano.maior).toBe('comunicacao');
    expect(plano.menor).toBe('rotina');
    expect(plano.amplitude).toBe(4);
  });

  it('faixaDominio nao promove numero pequeno a categoria grande', () => {
    // Um bloco de dez itens tem margem larga; chamar tres de "leve" ja e o
    // limite do que o dado aguenta.
    expect(faixaDominio(0, 10)).toBe('leve');
    expect(faixaDominio(3, 10)).toBe('leve');
    expect(faixaDominio(4, 10)).toBe('parcial');
    expect(faixaDominio(6, 10)).toBe('parcial');
    expect(faixaDominio(7, 10)).toBe('forte');
    expect(faixaDominio(10, 10)).toBe('forte');
    expect(faixaDominio(0, 0)).toBe('leve');
  });

  it('sempre entrega as seis secoes, na ordem', () => {
    for (const cenario of Object.values(CENARIOS)) {
      const plano = buildEspectroReportPlan(resultado(cenario));
      expect(plano.secoes.map((s) => s.id)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6']);
    }
  });

  it('TODA CHAVE QUE O PLANO ESCOLHE EXISTE NOS TRES IDIOMAS', () => {
    // Este e o teste que importa. O plano escolhe a chave pelos dados, entao
    // um cenario que nunca foi aberto a mao pode apontar para um texto que nao
    // existe — e quebrar na cara de quem acabou de pagar.
    for (const [nome, cenario] of Object.entries(CENARIOS)) {
      const plano = buildEspectroReportPlan(resultado(cenario));
      for (const [locale, catalogo] of Object.entries(CATALOGOS)) {
        const rel = catalogo.espectro_report as Record<string, Record<string, string>>;
        expect(rel, `${locale}: falta espectro_report`).toBeDefined();

        for (const secao of plano.secoes) {
          expect(
            rel[secao.id]?.[secao.corpoKey],
            `${locale} · ${nome}: falta espectro_report.${secao.id}.${secao.corpoKey}`,
          ).toBeTruthy();
          expect(
            (rel.sections as unknown as Record<string, string>)[secao.id],
            `${locale}: falta o titulo da secao ${secao.id}`,
          ).toBeTruthy();
        }

        for (const d of plano.dominios) {
          expect(
            (rel.domains as unknown as Record<string, string>)[d.dominio],
            `${locale}: falta o nome do territorio ${d.dominio}`,
          ).toBeTruthy();
        }

        // A faixa do total vira o rotulo do mapa, e ele vem do outro catalogo.
        const badge = (catalogo.espectro_result as Record<string, Record<string, string>>).badge;
        expect(badge?.[plano.faixa], `${locale}: falta a faixa ${plano.faixa}`).toBeTruthy();
      }
    }
  });

  it('os textos fixos do relatorio existem nos tres idiomas', () => {
    for (const [locale, catalogo] of Object.entries(CATALOGOS)) {
      const rel = catalogo.espectro_report as Record<string, unknown>;
      for (const chave of [
        'eyebrow', 'title', 'lead', 'generatedOn', 'totalLabel', 'domainCount',
        'profileTitle', 'profileLead', 'closingTitle', 'closing',
        'limitsTitle', 'limits', 'disclaimer', 'print', 'printHint',
      ]) {
        expect(typeof rel[chave], `${locale}: espectro_report.${chave}`).toBe('string');
      }
    }
  });

  it('o espectro esta a venda, e o catalogo concorda', () => {
    // `reportReady` e o que abre a cobranca no servidor. Ligado sem relatorio
    // seria vender o que nao existe; desligado com relatorio pronto e deixar
    // de entregar o que ja foi escrito.
    expect(ASSESSMENTS.find((a) => a.id === 'autism')?.available).toBe(true);
    expect(reportIsSellable('autism')).toBe(true);
  });
});
