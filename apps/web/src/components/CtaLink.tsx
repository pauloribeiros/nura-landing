import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import {
  FEATURED_ASSESSMENT,
  assessmentLandingPath,
  catalogPath,
} from '@/content/landing';

type Destination = 'featured' | 'catalog';

interface Props {
  to: Destination;
  className?: string;
  iconSize?: number;
  withIcon?: boolean;
  children: ReactNode;
}

/**
 * Every primary call to action on the site resolves through here, so there is
 * exactly one place that decides where "start" goes. Renders a real link, which
 * means it works without JavaScript and crawlers can follow it.
 */
export function CtaLink({
  to,
  className = 'button button-primary',
  iconSize = 16,
  withIcon = true,
  children,
}: Props) {
  const locale = useLocale() as Locale;

  const absolute =
    to === 'featured'
      ? assessmentLandingPath(locale, FEATURED_ASSESSMENT)
      : catalogPath(locale);

  // `Link` from the next-intl helpers adds the locale prefix itself.
  const href = absolute.replace(`/${locale}`, '') || '/';

  return (
    <Link className={className} href={href}>
      {children}
      {withIcon ? <ArrowRight size={iconSize} aria-hidden="true" /> : null}
    </Link>
  );
}
