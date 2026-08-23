'use client';

import { useTranslations } from 'next-intl';
import { RESULT_METRICS } from '@/content/landing';

/**
 * Client component only because of the pointer-driven tilt. The card writes
 * CSS custom properties instead of inline transforms, so the float animation
 * and the hover tilt compose in the stylesheet rather than fighting in JS.
 */
export function ResultCard() {
  const t = useTranslations('result');

  const setVars = (el: HTMLElement, rx: string, ry: string, gx: string, gy: string) => {
    el.style.setProperty('--card-rotate-x', rx);
    el.style.setProperty('--card-rotate-y', ry);
    el.style.setProperty('--card-glow-x', gx);
    el.style.setProperty('--card-glow-y', gy);
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
        setVars(
          event.currentTarget,
          `${(0.5 - y) * 5}deg`,
          `${(x - 0.5) * 6}deg`,
          `${x * 100}%`,
          `${y * 100}%`,
        );
      }}
      onPointerLeave={(event) => setVars(event.currentTarget, '0deg', '0deg', '50%', '50%')}
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

        <div className="result-signals" aria-hidden="true">
          <div className="signal-grid" />
          <svg viewBox="0 0 420 112" preserveAspectRatio="none" focusable="false">
            <path
              className="signal-line signal-line-one"
              d="M-12 65 C26 27 52 94 86 61 S146 22 181 56 S239 91 272 51 S333 20 366 54 S404 85 438 37"
            />
            <path
              className="signal-line signal-line-two"
              d="M-12 77 C29 52 54 84 87 69 S148 35 181 70 S238 87 274 64 S332 48 368 70 S402 72 438 58"
            />
            <path
              className="signal-line signal-line-three"
              d="M-12 38 C22 51 55 20 88 45 S148 84 181 43 S242 14 274 43 S332 77 367 41 S402 27 438 47"
            />
          </svg>
          <div className="signal-caption">
            <span>{t('signalCaption')}</span>
            <i />
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
