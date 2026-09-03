import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';
import ptBr from '../../../messages/pt-br.json';
import { ITENS_INTERATIVOS, SOLUCOES, itemInterativoPorId } from './itensInterativos';
import { verificarNoServidor } from './conectarPares';

import textEn from './data/text.en.json';
import textEs from './data/text.es.json';

const CATALOGOS = { 'pt-br': ptBr, en, es } as Record<string, Record<string, unknown>>;
const TEXTOS: Record<string, Record<string, { enunciado?: string }>> = {
  en: textEn as Record<string, { enunciado?: string }>,
  es: textEs as Record<string, { enunciado?: string }>,
};

/**
 * O que estes testes protegem e a coerencia da configuracao.
 *
 * Um par apontando para um id que nao existe, ou dois pontos empilhados no
 * mesmo lugar, produzem um item impossivel — e o unico jeito de descobrir
 * seria alguem travar nele durante os 60 segundos cronometrados.
 */
describe('itens interativos', () => {
  for (const item of ITENS_INTERATIVOS) {
    describe(item.id, () => {
      it('so liga pontos que existem', () => {
        const ids = new Set(item.config.pontos.map((p) => p.id));
        for (const [a, b] of item.config.paresCorretos) {
          expect(ids.has(a), `${item.id}: ${a} nao existe`).toBe(true);
          expect(ids.has(b), `${item.id}: ${b} nao existe`).toBe(true);
        }
      });

      it('usa todos os pontos, sem sobra', () => {
        // Um ponto sem par ficaria na tela sem servir para nada, e o item nunca
        // encerraria sozinho por "todos ligados".
        const usados = new Set(item.config.paresCorretos.flat());
        expect(usados.size).toBe(item.config.pontos.length);
      });

      it('da a cada par a sua cor, e nao repete cor entre pares', () => {
        // A cor E a instrucao: repetida entre pares, ela deixaria de dizer
        // quem liga com quem.
        const cores = item.config.paresCorretos.map(([a, b]) => {
          const ca = item.config.pontos.find((p) => p.id === a)!.cor;
          const cb = item.config.pontos.find((p) => p.id === b)!.cor;
          expect(ca, `${a} e ${b} tem cores diferentes`).toBe(cb);
          return ca;
        });
        expect(new Set(cores).size).toBe(cores.length);
      });

      it('mantem os pontos dentro da area e longe uns dos outros', () => {
        for (const p of item.config.pontos) {
          expect(p.x, `${p.id}.x fora da area`).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(100);
          expect(p.y, `${p.id}.y fora da area`).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(100);
        }
        // Dois pontos a menos de 12 unidades seriam um alvo so para um dedo.
        for (let i = 0; i < item.config.pontos.length; i++) {
          for (let j = i + 1; j < item.config.pontos.length; j++) {
            const a = item.config.pontos[i];
            const b = item.config.pontos[j];
            expect(
              Math.hypot(a.x - b.x, a.y - b.y),
              `${a.id} e ${b.id} estao perto demais para o dedo`,
            ).toBeGreaterThan(12);
          }
        }
      });

      it('da tempo suficiente para valer a pena tentar', () => {
        expect(item.config.tempoLimite).toBeGreaterThanOrEqual(30);
      });

      it('TEM SOLUCAO: existe um jeito de ligar tudo sem cruzar', () => {
        // Um item cujo unico caminho cruza e impossivel de acertar, e ninguem
        // descobriria isso olhando a tela — so alguem travando nele durante os
        // 60 segundos cronometrados. A solucao passa pela mesma regra que a
        // tela aplica, e nao por uma checagem paralela mais frouxa.
        const solucao = SOLUCOES[item.id];
        expect(solucao, `${item.id} nao declara solucao`).toBeDefined();

        const conferido = verificarNoServidor(
          solucao.map((l) => ({ ...l, correta: true })),
          item.config.paresCorretos,
        );
        expect(conferido.valido, `${item.id}: a solucao cruza`).toBe(true);
        expect(conferido.faltantes, `${item.id}: a solucao deixa par sem ligar`).toBe(0);
        expect(conferido.erros, `${item.id}: a solucao liga par errado`).toBe(0);
      });

      it('a solucao comeca e termina nos pontos certos', () => {
        for (const l of SOLUCOES[item.id]) {
          const de = item.config.pontos.find((p) => p.id === l.de)!;
          const para = item.config.pontos.find((p) => p.id === l.para)!;
          const inicio = l.tracado[0];
          const fim = l.tracado[l.tracado.length - 1];
          expect(Math.hypot(inicio.x - de.x, inicio.y - de.y), `${l.de}`).toBeLessThan(2);
          expect(Math.hypot(fim.x - para.x, fim.y - para.y), `${l.para}`).toBeLessThan(2);
        }
      });

      it('tem enunciado em pt-br e traduzido nos outros dois', () => {
        // O enunciado mora no banco, como o dos outros 44 itens.
        expect(item.enunciado.trim().length).toBeGreaterThan(10);
        for (const locale of ['en', 'es']) {
          const texto = TEXTOS[locale][item.id];
          expect(texto?.enunciado, `${locale}: falta o enunciado de ${item.id}`).toBeTruthy();
        }
      });

      it('tem os rotulos da tela nos tres idiomas', () => {
        // Os rotulos SAO interface, e por isso vivem no catalogo de mensagens.
        for (const [locale, catalogo] of Object.entries(CATALOGOS)) {
          const iq = catalogo.iq as Record<string, unknown>;
          const interativos = iq.interativos as Record<string, Record<string, string>> | undefined;
          expect(interativos?.[item.id], `${locale}: falta ${item.id}`).toBeDefined();
          for (const chave of ['instrucao', 'restante', 'ligadas', 'bloqueado', 'concluir', 'desfazer']) {
            expect(typeof interativos![item.id][chave], `${locale}: ${item.id}.${chave}`).toBe(
              'string',
            );
          }
        }
      });
    });
  }

  it('encontra um item pelo id, e nao inventa um que nao existe', () => {
    expect(itemInterativoPorId('ESP-14')?.id).toBe('ESP-14');
    expect(itemInterativoPorId('NAO-EXISTE')).toBeUndefined();
  });
});
