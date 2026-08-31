import { Instagram } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { INSTAGRAM_URL } from '@/content/landing';
import { ANCORA, LEGAL_SEGMENTS, OPERADOR, operadorIdentificado } from '@/content/legal';

/**
 * O bloco juridico do rodape.
 *
 * Existe uma vez so porque os dois rodapes — o da home e o das paginas
 * internas — precisam dele identico. Um dever legal que mora em dois arquivos
 * fica desatualizado em um deles.
 *
 * A IDENTIDADE VEM DE `OPERADOR` E NAO E INVENTADA. Enquanto ela nao estiver
 * preenchida, a frase que nomeia a empresa nao aparece e a coluna de links nao
 * e oferecida — as proprias paginas respondem 404 nesse estado, e um link para
 * uma pagina que nao existe e pior do que nenhum link. O resto da linha
 * (copyright, marcas de terceiros, o aviso de que isto nao e diagnostico) e
 * verdadeiro de qualquer forma e aparece sempre.
 *
 * COOKIES E REEMBOLSO NAO SAO PAGINAS: sao secoes dentro dos dois documentos,
 * e os links apontam para as ancoras delas. Quatro paginas para dizer o que
 * cabe em duas seria repeticao com risco de divergir.
 */
export function FooterLegalColumn() {
  const t = useTranslations('footer');
  const locale = useLocale() as Locale;
  if (!operadorIdentificado) return null;

  const privacidade = `/legal/${LEGAL_SEGMENTS.privacy[locale]}`;
  const termos = `/legal/${LEGAL_SEGMENTS.terms[locale]}`;

  return (
    <nav className="footer-col" aria-label={t('legalLabel')}>
      <h2 className="footer-col-title">{t('legalTitle')}</h2>
      <Link href={privacidade}>{t('privacy')}</Link>
      <Link href={termos}>{t('terms')}</Link>
      <Link href={`${privacidade}#${ANCORA.cookies}`}>{t('cookies')}</Link>
      <Link href={`${termos}#${ANCORA.reembolso}`}>{t('refund')}</Link>
    </nav>
  );
}

/** O perfil no Instagram, quando ele existe. */
export function FooterSocial() {
  const t = useTranslations('footer');
  if (!INSTAGRAM_URL) return null;

  return (
    <a
      className="footer-social"
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('instagram')}
    >
      <Instagram size={18} aria-hidden="true" />
    </a>
  );
}

/** A linha de copyright, identificacao do fornecedor e limite do servico. */
export function FooterLegalLine() {
  const t = useTranslations('footer');

  return (
    <p className="footer-legal-line">
      {t('legalCopyright', { year: new Date().getFullYear() })}{' '}
      {operadorIdentificado
        ? `${t('legalEntity', {
            razao: OPERADOR.razaoSocial,
            cnpj: OPERADOR.cnpj,
            endereco: OPERADOR.endereco,
          })} `
        : ''}
      {t('legalRest')}
    </p>
  );
}
