import 'server-only';

import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { reportarAviso } from '@/lib/observability/report';

/**
 * Limite de requisições por origem, para as rotas de API.
 *
 * O QUE ELE DEFENDE: as rotas que custam dinheiro ou escrevem no banco. Abrir
 * PaymentIntent em massa gera custo e ruído na Stripe; pontuar em massa enche
 * o banco. Nenhuma das duas coisas tem uso legítimo em volume.
 *
 * O QUE ELE NÃO DEFENDE: ataque volumétrico distribuído, que é problema de
 * borda e a Vercel já absorve antes de chegar aqui. Isto contém script, que é
 * o caso realista para um site deste tamanho.
 *
 * O WEBHOOK DA STRIPE FICA DE FORA, e não por esquecimento: ele é protegido
 * por assinatura, e a Stripe reenvia o mesmo evento várias vezes por desenho.
 * Limitar ali seria recusar um pagamento que já aconteceu.
 *
 * FALHA ABERTA. Se o banco não responder, a requisição passa. Um limitador que
 * derruba o site quando o contador está indisponível troca um problema raro
 * por um problema pior — e a falha vira um aviso no Sentry, que é o lugar
 * certo para ela.
 */

export interface Limite {
  /** Quantas requisições cabem na janela. */
  maximo: number;
  /** Tamanho da janela, em segundos. */
  janelaSegundos: number;
}

/** Uma hora é a janela de todas as rotas hoje; o nome existe para dar sentido. */
const HORA = 3600;

/**
 * Os limites, num lugar só.
 *
 * Números escolhidos para caber com folga no uso humano mais intenso que dá
 * para imaginar e ainda assim barrar script. Vale lembrar que operadora móvel
 * no Brasil usa CGNAT pesado: muita gente diferente sai pelo mesmo IP, então
 * limite apertado demais não protege melhor, só recusa gente de verdade.
 */
export const LIMITES = {
  pontuar: { maximo: 30, janelaSegundos: HORA },
  pagar: { maximo: 20, janelaSegundos: HORA },
} as const satisfies Record<string, Limite>;

/**
 * Quem está do outro lado, sem guardar quem está do outro lado.
 *
 * `x-forwarded-for` chega como uma lista; o primeiro item é o cliente e o
 * resto são os proxies pelo caminho. O valor é imediatamente transformado em
 * HMAC: o banco guarda um identificador estável e opaco, nunca o IP. A chave
 * do HMAC é o segredo de servidor que já existe, o que evita mais uma variável
 * de ambiente para alguém esquecer de configurar.
 */
function identificar(request: Request): string {
  const encaminhado = request.headers.get('x-forwarded-for');
  const ip =
    encaminhado?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'sem-ip';

  const chave = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'nura';
  return createHmac('sha256', chave).update(ip).digest('hex').slice(0, 32);
}

export interface Veredito {
  permitido: boolean;
  restante: number;
  /** Segundos até a janela virar. Só faz sentido quando `permitido` é falso. */
  segundosAteLiberar: number;
}

const LIVRE: Veredito = { permitido: true, restante: -1, segundosAteLiberar: 0 };

/**
 * Conta uma requisição desta origem para esta rota e diz se ela passa.
 *
 * `rota` entra no bucket para que gastar o limite de pagamento não gaste o de
 * pontuação — são abusos diferentes e merecem contas separadas.
 */
export async function limitar(request: Request, rota: string, limite: Limite): Promise<Veredito> {
  const admin = getSupabaseAdminClient();
  if (!admin) return LIVRE;

  const bucket = `${rota}:${limite.janelaSegundos}:${identificar(request)}`;

  const { data, error } = await admin.rpc('consumir_rate_limit', {
    p_bucket: bucket,
    p_maximo: limite.maximo,
    p_janela_segundos: limite.janelaSegundos,
  });

  if (error || !data?.[0]) {
    reportarAviso('rate limit indisponivel, requisicao liberada', error?.message, { rota });
    return LIVRE;
  }

  const linha = data[0] as { permitido: boolean; restante: number; expira_em: string };
  const faltam = Math.max(0, Math.ceil((new Date(linha.expira_em).getTime() - Date.now()) / 1000));

  return {
    permitido: linha.permitido,
    restante: linha.restante,
    segundosAteLiberar: faltam,
  };
}

/**
 * A resposta de recusa.
 *
 * `Retry-After` existe para que um cliente educado saiba esperar em vez de
 * insistir — e para que, quando o barrado for gente de verdade atrás de um
 * CGNAT, a tela tenha o que dizer além de "erro".
 */
export function respostaDeExcesso(veredito: Veredito) {
  return NextResponse.json(
    { error: 'rate-limited', retryAfter: veredito.segundosAteLiberar },
    { status: 429, headers: { 'Retry-After': String(veredito.segundosAteLiberar) } },
  );
}
