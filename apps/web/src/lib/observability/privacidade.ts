/**
 * O filtro que fica entre um erro e o Sentry.
 *
 * Monitoramento de erro existe para dizer O QUE quebrou, nunca PARA QUEM. Neste
 * produto a diferença não é estilo: as respostas de uma avaliação de TDAH ou de
 * espectro autista são dado pessoal sensível sob a LGPD, e um relatório de erro
 * é enviado a um terceiro (Sentry, fora do Brasil) sem consentimento — porque
 * ele existe por interesse legítimo de manter o serviço de pé, não por escolha
 * do visitante.
 *
 * A consequência prática é que a carga precisa ser esterilizada ANTES de sair.
 * O que sobra é suficiente para depurar (tipo do erro, arquivo, linha, rota) e
 * insuficiente para identificar alguém.
 *
 * O `id` de sessão é a exceção deliberada: é um UUID sem significado fora do
 * banco, e sem ele um erro de pontuação vira impossível de reproduzir.
 */

import type { ErrorEvent } from '@sentry/nextjs';

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/** Cabeçalhos que descrevem o pedido sem descrever quem o fez. */
const CABECALHOS_PERMITIDOS = new Set(['content-type', 'user-agent', 'referer']);

const PROFUNDIDADE_MAXIMA = 6;

function limparTexto(valor: string): string {
  return valor.replace(EMAIL, '[email]');
}

/**
 * Percorre a carga inteira trocando e-mails por um marcador.
 *
 * É recursivo porque um e-mail pode aparecer em qualquer lugar — na mensagem
 * do erro, num `extra`, numa URL, no corpo de uma resposta que alguém anexou.
 * O limite de profundidade evita que um objeto cíclico ou absurdamente aninhado
 * transforme a limpeza no próprio incidente.
 */
function limpar(valor: unknown, profundidade = 0): unknown {
  if (profundidade > PROFUNDIDADE_MAXIMA) return '[profundo demais]';
  if (typeof valor === 'string') return limparTexto(valor);
  if (Array.isArray(valor)) return valor.map((item) => limpar(item, profundidade + 1));
  if (valor && typeof valor === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [chave, item] of Object.entries(valor)) {
      saida[chave] = limpar(item, profundidade + 1);
    }
    return saida;
  }
  return valor;
}

/**
 * `beforeSend` de todos os runtimes — servidor, edge e navegador.
 *
 * Devolver `null` descartaria o evento; aqui nunca descartamos, só podamos.
 */
export function esterilizar(evento: ErrorEvent): ErrorEvent {
  // Sem usuário. Nem id, nem e-mail, nem IP — mesmo com `sendDefaultPii: false`
  // o IP pode ser inferido pelo servidor de ingestão, e este campo é o que o
  // painel usa para agrupar por pessoa. Não queremos esse agrupamento.
  delete evento.user;

  if (evento.request) {
    // O corpo de um POST daqui é, literalmente, as respostas de alguém.
    delete evento.request.data;
    delete evento.request.cookies;
    if (evento.request.headers) {
      evento.request.headers = Object.fromEntries(
        Object.entries(evento.request.headers).filter(([chave]) =>
          CABECALHOS_PERMITIDOS.has(chave.toLowerCase()),
        ),
      );
    }
  }

  // `console` vira migalha por padrão, e o `console.error` desta base às vezes
  // carrega contexto de domínio. O rastro de navegação (`navigation`, `fetch`,
  // `ui.click`) continua, que é o que ajuda a reconstruir o caminho até a falha.
  if (evento.breadcrumbs) {
    evento.breadcrumbs = evento.breadcrumbs.filter((m) => m.category !== 'console');
  }

  return limpar(evento) as ErrorEvent;
}
