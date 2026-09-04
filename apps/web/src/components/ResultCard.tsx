'use client';

import { useTranslations } from 'next-intl';
import { RESULT_METRICS } from '@/content/landing';

/**
 * Client component only because of the pointer-driven tilt. The card writes
 * CSS custom properties instead of inline transforms, so the float animation
 * and the hover tilt compose in the stylesheet rather than fighting in JS.
 *
 * O GRAFICO DE LINHAS SAIU DAQUI. Eram tres curvas animadas sobre uma grade de
 * blueprint, com um brilho ciano deslizando e um ponto pulsando ao lado de
 * "LEITURA EM FORMACAO" — sem eixo, sem escala, sem unidade. Nao representavam
 * nada: "linhas onduladas + grade + brilho ciano" e o pictograma generico de
 * "IA/dados", e era ele que dava a esta secao cara de template. Um resultado de
 * saude tambem nao pulsa: o proprio CSS deste projeto ja diz por que.
 */
export function ResultCard() {
  const t = useTranslations('result');

  const setVars = (el: HTMLElement, rx: string, ry: string) => {
    el.style.setProperty('--card-rotate-x', rx);
    el.style.setProperty('--card-rotate-y', ry);
  };

  return (
    <div
      className="result-card-shell reveal"
      onPointerMove={(event) => {
        // Coarse pointers get no tilt: on touch the "hover" is a tap and the
        // card would jump under the finger.
        if (event.pointerType !== 'mouse') return;
        const b = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - b.left) / b.width;
        const y = (event.clientY - b.top) / b.height;
        setVars(event.currentTarget, `${(0.5 - y) * 5}deg`, `${(x - 0.5) * 6}deg`);
      }}
      onPointerLeave={(event) => setVars(event.currentTarget, '0deg', '0deg')}
    >
      <div className="result-card">
        <div className="result-card-head">
          <div>
            <span className="mono result-card-label">{t('cardLabel')}</span>
            <h3>{t('cardTitle')}</h3>
          </div>
          <div className="result-avatar" aria-hidden="true">
            {t('cardAvatar')}
          </div>
        </div>

        <span className="result-tag">{t('tag')}</span>
        <div className="result-highlight">
          <b>{t('highlight')}</b>
          <small>{t('highlightNote')}</small>
        </div>

        {RESULT_METRICS.map((metric) => (
          <div className="metric" key={metric.id}>
            <div>
              <span>{t(metric.id)}</span>
              <div className="metric-track">
                <span style={{ width: `${metric.value}%` }} />
              </div>
            </div>
            <b>{metric.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
