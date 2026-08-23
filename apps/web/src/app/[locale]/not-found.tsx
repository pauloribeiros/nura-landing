import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <main className="not-found">
      <div className="wrap not-found-inner">
        <h1>{t('title')}</h1>
        <p>{t('copy')}</p>
        <Link className="button button-primary" href="/">
          {t('cta')}
        </Link>
      </div>
    </main>
  );
}
