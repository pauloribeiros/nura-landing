import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A corrida que apagava um questionario inteiro.
 *
 * `begin()` no AssessmentRunner chama `setSession` — que dispara o efeito que
 * salva — e `openRemoteSession` no mesmo instante. As duas pediam
 * `ensureSession`, nenhuma achava sessao, e cada uma abria a sua: a linha da
 * corrida entrava como um usuario anonimo e o cookie terminava com o outro.
 *
 * Dali em diante a RLS barrava toda escrita, `saveSession` so registrava um
 * aviso no console, e a pessoa respondia as 18 perguntas sem que uma unica
 * resposta fosse gravada. O 404 aparecia no fim, ao pontuar — quando a corrida
 * ja estava perdida. Aconteceu de verdade: uma rodada com 18 respostas dadas e
 * zero gravadas.
 *
 * O que este teste protege e o invariante: quantas chamadas simultaneas
 * existam, `signInAnonymously` acontece uma vez so.
 */

const sessaoFalsa = { user: { id: 'usuario-1' } };

const getSession = vi.fn();
const signInAnonymously = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({ auth: { getSession, signInAnonymously } }),
}));

vi.mock('./env', () => ({
  SUPABASE_URL: 'https://exemplo.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'chave',
  supabaseConfigured: true,
}));

async function carregar() {
  vi.resetModules();
  return import('./client');
}

beforeEach(() => {
  getSession.mockReset();
  signInAnonymously.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ensureSession', () => {
  it('abre UMA entrada anonima para chamadas simultaneas', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    signInAnonymously.mockImplementation(
      () =>
        new Promise((resolve) =>
          // Um tempo de rede: e exatamente esta janela que produzia dois
          // usuarios, porque as duas chamadas passavam pelo getSession vazio
          // antes de qualquer uma completar a entrada.
          setTimeout(() => resolve({ data: { session: sessaoFalsa }, error: null }), 10),
        ),
    );

    const { ensureSession } = await carregar();
    const [a, b, c] = await Promise.all([ensureSession(), ensureSession(), ensureSession()]);

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(a).toBe(sessaoFalsa);
    expect(b).toBe(sessaoFalsa);
    expect(c).toBe(sessaoFalsa);
  });

  it('reaproveita a sessao existente sem abrir outra', async () => {
    getSession.mockResolvedValue({ data: { session: sessaoFalsa } });

    const { ensureSession } = await carregar();
    await Promise.all([ensureSession(), ensureSession()]);

    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('volta a permitir entrada depois de uma falha', async () => {
    // A promessa em voo e limpa ao terminar, inclusive quando falha: uma queda
    // de rede nao pode deixar a aba sem conseguir entrar pelo resto da visita.
    getSession.mockResolvedValue({ data: { session: null } });
    signInAnonymously
      .mockResolvedValueOnce({ data: { session: null }, error: { message: 'rede' } })
      .mockResolvedValueOnce({ data: { session: sessaoFalsa }, error: null });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { ensureSession } = await carregar();
    expect(await ensureSession()).toBeNull();
    expect(await ensureSession()).toBe(sessaoFalsa);
    expect(signInAnonymously).toHaveBeenCalledTimes(2);
  });
});
