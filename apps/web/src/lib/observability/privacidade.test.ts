import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/nextjs';
import { esterilizar } from './privacidade';

/**
 * Este arquivo existe porque `esterilizar` é o que separa "sabemos que quebrou"
 * de "vazamos dado sensível para um terceiro". Uma regressão aqui não aparece
 * em nenhuma tela: o evento sai errado e ninguém fica sabendo.
 */

const base = () => ({ event_id: 'x', platform: 'node' }) as unknown as ErrorEvent;

describe('esterilizar', () => {
  it('não deixa passar identificação de usuário', () => {
    const evento = { ...base(), user: { id: 'u1', email: 'ana@exemplo.com', ip_address: '1.2.3.4' } };
    expect(esterilizar(evento as ErrorEvent).user).toBeUndefined();
  });

  it('descarta o corpo da requisição, que aqui são as respostas de alguém', () => {
    const evento = {
      ...base(),
      request: { url: 'https://nuraperfil.com/api/iq/score', data: { answers: [1, 2, 3] } },
    };
    expect((esterilizar(evento as ErrorEvent).request as Record<string, unknown>).data).toBeUndefined();
  });

  it('descarta cookie e mantém só cabeçalho que não identifica', () => {
    const evento = {
      ...base(),
      request: {
        cookies: { 'sb-access-token': 'segredo' },
        headers: { cookie: 'sb=1', authorization: 'Bearer x', 'user-agent': 'Safari' },
      },
    };
    const req = esterilizar(evento as ErrorEvent).request as Record<string, unknown>;
    expect(req.cookies).toBeUndefined();
    expect(req.headers).toEqual({ 'user-agent': 'Safari' });
  });

  it('troca e-mail por marcador em qualquer profundidade', () => {
    const evento = {
      ...base(),
      message: 'falha ao enviar para ana.silva+nura@exemplo.com.br',
      contexts: { nura: { fila: [{ destino: 'rafael@teste.org' }] } },
    };
    const limpo = esterilizar(evento as ErrorEvent) as unknown as Record<string, never>;
    expect(JSON.stringify(limpo)).not.toContain('@exemplo.com.br');
    expect(JSON.stringify(limpo)).not.toContain('rafael@teste.org');
    expect(limpo.message).toContain('[email]');
  });

  it('remove migalha de console, que carrega contexto de domínio', () => {
    const evento = {
      ...base(),
      breadcrumbs: [
        { category: 'console', message: '[nura] resposta 4' },
        { category: 'navigation', message: '/pt-br/r/abc' },
      ],
    };
    const migalhas = esterilizar(evento as ErrorEvent).breadcrumbs ?? [];
    expect(migalhas).toHaveLength(1);
    expect(migalhas[0].category).toBe('navigation');
  });

  it('não descarta o evento nem trava com objeto cíclico', () => {
    const ciclico: Record<string, unknown> = { nome: 'raiz' };
    ciclico.eu = ciclico;
    const evento = { ...base(), contexts: { nura: ciclico } };
    expect(esterilizar(evento as ErrorEvent)).toBeTruthy();
  });
});
