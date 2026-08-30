'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CtaLink } from './CtaLink';

export function MobileStickyCta() {
  const t = useTranslations('stickyCta');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Document height only changes on resize/layout. Reading it inside the
    // scroll handler forced a layout on every scroll frame.
    let docHeight = document.documentElement.scrollHeight;
    let winHeight = window.innerHeight;
    const measure = () => {
      docHeight = document.documentElement.scrollHeight;
      winHeight = window.innerHeight;
    };
    const handler = () => {
      const y = window.scrollY;
      setVisible(y > winHeight * 0.8 && y < docHeight - winHeight * 1.5);
    };
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div className={`mobile-cta ${visible ? 'visible' : ''}`}>
      <CtaLink to="catalog" className="button button-primary button-wide">
        {t('label')}
      </CtaLink>
    </div>
  );
}
