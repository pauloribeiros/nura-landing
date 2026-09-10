'use client';

/**
 * A última rede antes da tela branca.
 *
 * O Next só chega aqui quando o erro aconteceu no layout raiz — acima de
 * qualquer `error.tsx` de página. Como o layout é quem monta `<html>`, esta
 * tela precisa montar o dela.
 *
 * Também é o único lugar de onde um erro de render do cliente chega ao Sentry:
 * o React engole a exceção ao trocar pela fronteira de erro, e sem este
 * `captureException` a falha existiria só na tela de quem a viu.
 */

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ERRO_FATAL, localeDoCaminho, type LocaleDeErro } from '@/content/erroFatal';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  /**
   * O idioma entra depois da hidratacao, de proposito.
   *
   * Ler `window.location` no primeiro render faria o servidor e o cliente
   * desenharem textos diferentes, e uma divergencia de hidratacao DENTRO da
   * tela de erro derrubaria a propria tela de erro.
   */
  const [locale, setLocale] = useState<LocaleDeErro>('pt-br');
  useEffect(() => setLocale(localeDoCaminho(window.location.pathname)), []);

  const texto = ERRO_FATAL[locale];

  return (
    <html lang={locale}>
      <body>
        <main className="not-found">
          <div className="wrap not-found-inner">
            <h1>{texto.titulo}</h1>
            <p>{texto.texto}</p>
            <button className="button button-primary" type="button" onClick={reset}>
              {texto.acao}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
