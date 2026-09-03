import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';
import ptBr from '../../../messages/pt-br.json';
import { ITENS_INTERATIVOS, itemInterativoPorId } from './itensInterativos';

const CATALOGOS = { 'pt-br': ptBr, en, es } as Record<string, Record<string, unknown>>;

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

      it('tem enunciado nos tres idiomas', () => {
        for (const [locale, catalogo] of Object.entries(CATALOGOS)) {
          const iq = catalogo.iq as Record<string, unknown>;
          const interativos = iq.interativos as Record<string, Record<string, string>> | undefined;
          expect(interativos?.[item.id], `${locale}: falta ${item.id}`).toBeDefined();
          for (const chave of ['enunciado', 'instrucao', 'bloqueado', 'concluir', 'desfazer']) {
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
