'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { saveLead } from '@/lib/supabase/leadStore';
import { track } from '@/lib/analytics';

/**
 * O e-mail e, em seguida, a pagina de pagamento.
 *
 * O MESMO PORTAO DO TESTE DE QI, e pelo mesmo motivo: o endereco e a unica
 * coisa que sobrevive a uma desistencia no checkout. Pedido depois do
 * pagamento, ele so existe para quem pagou; pedido aqui, ele fica mesmo quando
 * a compra nao acontece — e e ele que leva o relatorio quando ela acontece.
 *
 * GRAVADO ANTES DE SAIR DESTA TELA. Se a gravacao falhar seguimos assim mesmo:
 * o Stripe pede um e-mail de recibo de qualquer forma, e barrar a compra por
 * causa da nossa lista seria trocar uma venda por um contato.
 *
 * Para a nossa pagina, nao direto ao Stripe: e la que a pessoa ve o que esta
 * comprando ao lado da escolha do meio de pagamento, e e la que os campos do
 * cartao aparecem sem ela sair do site. A pagina resolve dono e preco do lado
 * do servidor a partir do id da sessao, entao nao ha nada aqui para adulterar.
 *
 * Sem id de sessao nao ha o que comprar — acontece quando o resultado vem de
 * uma corrida local que nunca chegou ao banco. O formulario continua visivel e
 * o botao, desligado.
 */
export function UnlockButton({
  sessionId,
  assessmentId,
}: {
  sessionId?: string;
  assessmentId: string;
}) {
  const t = useTranslations('result_screen');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');

  const valido = /.+@.+\..+/.test(email.trim());

  const start = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!sessionId || !valido || state === 'sending') return;

    setState('sending');
    track('lead_submitted', { assessment: assessmentId, source: 'result_gate' });
    await saveLead({ email: email.trim(), assessmentId, sessionId, locale });

    track('checkout_started', { assessment: assessmentId });
    window.location.href = `/${locale}/p/${sessionId}`;
  };

  return (
    <form className="gate-form" onSubmit={start}>
      <label className="gate-field">
        <span>{t('emailLabel')}</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <button
        type="submit"
        className="button button-primary"
        disabled={!sessionId || !valido || state === 'sending'}
      >
        {state === 'sending' ? t('premiumSending') : t('premiumCta')}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      {state === 'error' ? <p className="runner-hint">{t('premiumError')}</p> : null}
    </form>
  );
}
