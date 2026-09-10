/**
 * A única porta de saída para um erro que ninguém está olhando.
 *
 * ONDE ISTO NASCEU: o checkout ficou quebrado em produção por causa de um
 * espaço em branco antes do `sk_live_` na Vercel. A chave inválida fazia a
 * Stripe recusar a requisição sem sequer registrá-la no log da conta, e o
 * `console.error` do servidor ia para um log da Vercel que ninguém abre. A
 * falha só foi descoberta porque o dono tentou comprar. Levou horas.
 *
 * `console.error` continua acontecendo — é o que serve durante o
 * desenvolvimento e o que a Vercel guarda. O que muda é que agora existe um
 * segundo destino, que avisa sem ser consultado.
 *
 * `causa` aceita qualquer coisa porque as chamadas desta base são assim: às
 * vezes um `Error`, às vezes só `error.message`, às vezes um id. O que não for
 * `Error` é anexado como contexto, e a mensagem vira o título do agrupamento —
 * que é o que mantém o painel legível.
 */

import * as Sentry from '@sentry/nextjs';

type Contexto = Record<string, unknown>;

function comPrefixo(mensagem: string) {
  return `[nura] ${mensagem}`;
}

/** Uma falha que impede alguém de concluir o que veio fazer. */
export function reportarErro(mensagem: string, causa?: unknown, contexto?: Contexto): void {
  console.error(comPrefixo(mensagem), causa ?? '', contexto ?? '');

  Sentry.withScope((escopo) => {
    if (contexto) escopo.setContext('nura', contexto);

    if (causa instanceof Error) {
      // A mensagem vira impressão digital para que dez erros diferentes da
      // Stripe não virem dez grupos com o mesmo nome — e para que o mesmo erro
      // não se espalhe em grupos diferentes a cada variação do texto dela.
      escopo.setFingerprint([mensagem]);
      Sentry.captureException(causa);
      return;
    }

    if (causa !== undefined) escopo.setExtra('causa', causa);
    Sentry.captureMessage(comPrefixo(mensagem), 'error');
  });
}

/** Algo errado que o sistema soube absorver — vale saber, não vale acordar. */
export function reportarAviso(mensagem: string, causa?: unknown, contexto?: Contexto): void {
  console.warn(comPrefixo(mensagem), causa ?? '', contexto ?? '');

  Sentry.withScope((escopo) => {
    if (contexto) escopo.setContext('nura', contexto);
    if (causa !== undefined) escopo.setExtra('causa', causa);
    escopo.setFingerprint([mensagem]);
    Sentry.captureMessage(comPrefixo(mensagem), 'warning');
  });
}
