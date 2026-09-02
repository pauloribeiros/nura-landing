'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from './env';

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser Supabase client, created once per tab.
 *
 * Returns null when the project is not configured, so the assessment can fall
 * back to local storage instead of crashing. Every call site has to handle
 * that anyway — a person mid-questionnaire should not lose their answers
 * because the database is unreachable.
 */
export function getSupabaseBrowserClient() {
  if (!supabaseConfigured) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}

/**
 * A entrada anonima em voo, compartilhada por quem pedir ao mesmo tempo.
 *
 * SEM ISTO, DUAS CHAMADAS SIMULTANEAS CRIAVAM DOIS USUARIOS. `begin()` no
 * AssessmentRunner faz `setSession` — que dispara o efeito que salva — e
 * `openRemoteSession` no mesmo instante. As duas chamavam `ensureSession`,
 * nenhuma achava sessao, e cada uma abria a sua: a linha da corrida era
 * inserida como um usuario e o cookie terminava com o outro.
 *
 * O estrago era invisivel e total. A RLS passava a barrar toda escrita
 * seguinte, `saveSession` apenas registrava um aviso no console, e a pessoa
 * respondia o questionario inteiro sem que uma resposta fosse gravada. So no
 * fim, ao pontuar, o servidor respondia 404 — e ai a corrida ja estava
 * perdida. Uma rodada real terminou assim: 18 respostas, zero gravadas.
 */
let entrando: Promise<Session | null> | null = null;

/**
 * Ensures there is a session, creating an anonymous one if needed.
 *
 * Anonymous sign-in issues a real uid with the `authenticated` role, which is
 * what every RLS policy keys on. Section 27 wants the person to answer before
 * being asked to sign up; this is the mechanism that makes that possible
 * without the rows being ownerless.
 */
export async function ensureSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  // `??=` e sincrono: quem chegar enquanto a entrada esta em voo espera a
  // mesma promessa em vez de abrir outra. Limpa ao terminar para que uma
  // sessao expirada mais tarde possa entrar de novo.
  entrando ??= (async () => {
    const { data: created, error } = await supabase.auth.signInAnonymously();
    if (error) {
      // Sign-in can fail for reasons outside our control — anonymous sign-ins
      // disabled, rate limit, network. The run continues locally.
      console.warn('[nura] anonymous sign-in failed, continuing locally', error.message);
      return null;
    }
    return created.session;
  })().finally(() => {
    entrando = null;
  });

  return entrando;
}
