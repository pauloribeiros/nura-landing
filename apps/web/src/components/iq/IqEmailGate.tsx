'use client';

import { useState } from 'react';
import { ArrowRight, Clock, Gauge } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { IqResult } from '@/domain/iq/scoring';
import {
  percentilPorTempo,
  percentilSimuladoLigado,
} from '@/domain/iq/percentilSimulado';
import { saveLead } from '@/lib/supabase/leadStore';
import { track } from '@/lib/analytics';

/**
 * A tela entre o cálculo e o pagamento: o e-mail, e daí para o checkout.
 *
 * O RESULTADO NÃO APARECE AQUI. Foi decisão do Paulo para esta fase — quem
 * termina o teste vai direto para o e-mail e para o pagamento. O relatório é o
 * que está sendo comprado, e ele existe do lado do servidor desde o momento em
 * que a pontuação foi gravada; nada do que a pessoa fizer nesta tela muda o
 * que ela vai receber.
 *
 * O E-MAIL É GRAVADO ANTES DE IR PARA O STRIPE. Se o checkout for abandonado,
 * o endereço fica — é a única coisa que sobrevive a uma desistência, e é para
 * isso que ele é pedido antes e não depois.
 *
 * "MAIS RÁPIDO QUE X%" só aparece com `NEXT_PUBLIC_IQ_PERCENTIL_SIMULADO=1`.
 * O número é simulado, não medido, e o arquivo que o produz diz isso em toda
 * linha. Sem a variável, a tela mostra só o tempo, que é real.
 */
export function IqEmailGate({
  sessionId,
  result,
}: {
  sessionId?: string;
  result: IqResult;
}) {
  const t = useTranslations('iq_gate');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'erro'>('idle');

  const minutos = Math.floor(result.tempoTotal_ms / 60000);
  const segundos = Math.floor((result.tempoTotal_ms % 60000) / 1000);
  const valido = /.+@.+\..+/.test(email.trim());

  const seguir = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!valido || estado === 'enviando') return;

    setEstado('enviando');
    track('lead_submitted', { assessment: 'cognition', source: 'iq_gate' });

    // Guardado primeiro: um checkout abandonado ainda deixa o contato.
    await saveLead({ email: email.trim(), assessmentId: 'cognition', sessionId, locale });

    if (!sessionId) {
      setEstado('erro');
      return;
    }

    // Para a nossa página de pagamento, não direto ao Stripe: a escolha do
    // meio de pagamento acontece na nossa casa, com o resumo do que está
    // sendo comprado ao lado.
    window.location.href = `/${locale}/p/${sessionId}`;
  };

  return (
    <section className="runner iq-gate">
      <div className="wrap runner-inner">
        <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
        <h1>{t('title')}</h1>
        <p className="runner-lead">{t('lead')}</p>

        <form className="iq-gate-form" onSubmit={seguir}>
          <label className="iq-gate-field">
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

          <button type="submit" className="button button-primary" disabled={!valido || estado === 'enviando'}>
            {estado === 'enviando' ? t('sending') : t('cta')}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>

        {estado === 'erro' ? <p className="runner-hint">{t('error')}</p> : null}

        <ul className="iq-gate-stats">
          <li>
            <Clock size={16} aria-hidden="true" />
            <span className="iq-gate-stat-label">{t('statTime')}</span>
            <b>
              {minutos}m {String(segundos).padStart(2, '0')}s
            </b>
          </li>
          {percentilSimuladoLigado ? (
            <li>
              <Gauge size={16} aria-hidden="true" />
              <span className="iq-gate-stat-label">{t('statSpeed')}</span>
              <b>{t('statSpeedValue', { pct: percentilPorTempo(result.tempoTotal_ms) })}</b>
            </li>
          ) : null}
        </ul>

        <p className="runner-disclaimer">{t('legal')}</p>
      </div>
    </section>
  );
}
