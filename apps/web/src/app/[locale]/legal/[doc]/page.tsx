import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { LOCALE_META, locales, routing, type Locale } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import {
  LEGAL_DOCS,
  LEGAL_SEGMENTS,
  legalDocBySegment,
  operadorIdentificado,
  type LegalDoc,
} from '@/content/legal';

/**
 * Politica de privacidade e termos, um por segmento localizado
 * (`/pt-br/legal/privacidade`, `/en/legal/privacy`).
 *
 * AS PAGINAS NAO EXISTEM ENQUANTO `OPERADOR` ESTIVER VAZIO. Um documento que
 * diz "o controlador dos seus dados e ___" nao cumpre o dever de informar; ele
 * so parece cumprir, que e pior. Preenchida a identidade, as duas paginas
 * passam a ser geradas sozinhas e o rodape passa a oferece-las.
 *
 * O conteudo e estatico e igual para todo mundo, entao as rotas sao geradas na
 * build — nada aqui depende de quem esta lendo.
 */

export function generateStaticParams() {
  if (!operadorIdentificado) return [];
  return locales.flatMap((locale) =>
    (Object.keys(LEGAL_SEGMENTS) as LegalDoc[]).map((doc) => ({
      locale,
      doc: LEGAL_SEGMENTS[doc][locale],
    })),
  );
}

type Params = Promise<{ locale: string; doc: string }>;

function resolver(locale: string, segmento: string) {
  if (!operadorIdentificado) return null;
  if (!hasLocale(routing.locales, locale)) return null;
  const doc = legalDocBySegment(locale as Locale, segmento);
  if (!doc) return null;
  return { loc: locale as Locale, doc };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, doc } = await params;
  const alvo = resolver(locale, doc);
  if (!alvo) notFound();

  const conteudo = LEGAL_DOCS[alvo.loc][alvo.doc];
  const path = `/${alvo.loc}/legal/${LEGAL_SEGMENTS[alvo.doc][alvo.loc]}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: conteudo.metaTitle,
    description: conteudo.metaDescription,
    alternates: {
      canonical: path,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            LOCALE_META[l].lang,
            `/${l}/legal/${LEGAL_SEGMENTS[alvo.doc][l]}`,
          ]),
        ),
        'x-default': `/${routing.defaultLocale}/legal/${LEGAL_SEGMENTS[alvo.doc][routing.defaultLocale]}`,
      },
    },
  };
}

export default async function PaginaLegal({ params }: { params: Params }) {
  const { locale, doc } = await params;
  const alvo = resolver(locale, doc);
  if (!alvo) notFound();
  setRequestLocale(alvo.loc);

  const conteudo = LEGAL_DOCS[alvo.loc][alvo.doc];

  return (
    <>
      <SiteHeader locale={alvo.loc} />
      <main className="page page-dark">
        <article className="legal">
          <div className="wrap legal-inner">
            <header className="legal-head">
              <h1>{conteudo.titulo}</h1>
              <p className="legal-summary">{conteudo.resumo}</p>
              <p className="legal-updated">{conteudo.atualizado}</p>
            </header>

            {conteudo.secoes.map((secao) => (
              <section key={secao.titulo} id={secao.id} className="legal-section">
                <h2>{secao.titulo}</h2>
                {secao.paragrafos?.map((texto) => (
                  <p key={texto}>{texto}</p>
                ))}
                {secao.itens ? (
                  <ul>
                    {secao.itens.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
