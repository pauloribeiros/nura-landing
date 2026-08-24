import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DM_Sans, Manrope, Space_Mono } from 'next/font/google';
import { LOCALE_META, locales, routing, type Locale } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';
import { RevealObserver } from '@/components/RevealObserver';
import '../globals.css';

// Self-hosted through Next, so there is no render-blocking request to a font
// host and no @import chain.
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-dm-sans' });
const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-manrope' });
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-space-mono',
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: 'meta' });
  const meta = LOCALE_META[locale as Locale];

  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [LOCALE_META[l].lang, `/${l}`])),
        'x-default': `/${routing.defaultLocale}`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'NURA',
      locale: meta.ogLocale,
      url: `/${locale}`,
      title: t('ogTitle'),
      description: t('ogDescription'),
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: t('ogImageAlt') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description: t('ogDescription'),
      images: ['/og-image.jpg'],
    },
    robots: { index: true, follow: true, 'max-image-preview': 'large' },
  };
}

export const viewport = {
  themeColor: '#070B14',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={LOCALE_META[locale as Locale].lang}
      className={`${dmSans.variable} ${manrope.variable} ${spaceMono.variable}`}
      // The script below adds `js` to this element before React hydrates, so
      // the server markup and the live DOM differ here by design. React warns
      // and, on <html>, refuses to reconcile — which would drop the class and
      // leave every reveal stuck at opacity 0. Suppressing is the fix, and it
      // covers this element's own attributes only, not its subtree.
      suppressHydrationWarning
    >
      <head>
        {/* Runs before first paint. Reveal styles are gated on `.js`, so if
            scripting is off or the bundle fails the content simply shows. */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
      </head>
      <body>
        <NextIntlClientProvider>
          <RevealObserver />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
