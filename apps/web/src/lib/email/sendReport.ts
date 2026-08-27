import 'server-only';

import { getResend, MAIL_FROM } from './resend';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/site';
import { randomId } from '@/lib/randomId';

/**
 * Sends someone the link to the report they bought.
 *
 * The link carries a token rather than relying on the browser session, because
 * an email is opened on whatever device is at hand. Access decided by the
 * anonymous cookie works exactly once — on the phone, or after clearing the
 * browser, the report a person paid for would answer 404.
 *
 * No PDF attached. Generating one server side means running a headless browser
 * per email, and the report page already prints to PDF from any device. A link
 * also keeps working when the report is corrected, which an attachment does
 * not.
 *
 * Every failure here is swallowed and logged. This runs after money has
 * changed hands and access has been granted; an email that did not send must
 * never turn into a purchase that did not complete.
 */

const COPY: Record<string, { subject: string; heading: string; body: string; cta: string; note: string }> = {
  'pt-br': {
    subject: 'Seu Relatório NURA está pronto',
    heading: 'Seu relatório está pronto',
    body: 'Obrigado pela compra. Seu relatório completo organiza as respostas que você deu e explica o que cada padrão costuma significar no dia a dia.',
    cta: 'Abrir meu relatório',
    note: 'Este link é seu e não expira. Guarde este e-mail — é por ele que você volta ao relatório de qualquer aparelho.',
  },
  en: {
    subject: 'Your NURA report is ready',
    heading: 'Your report is ready',
    body: 'Thank you for your purchase. Your full report organises the answers you gave and explains what each pattern tends to mean day to day.',
    cta: 'Open my report',
    note: 'This link is yours and does not expire. Keep this email — it is how you get back to the report from any device.',
  },
  es: {
    subject: 'Tu Informe NURA está listo',
    heading: 'Tu informe está listo',
    body: 'Gracias por tu compra. Tu informe completo organiza las respuestas que diste y explica qué suele significar cada patrón en el día a día.',
    cta: 'Abrir mi informe',
    note: 'Este enlace es tuyo y no caduca. Guarda este correo — es como vuelves al informe desde cualquier dispositivo.',
  },
};

/** Creates the token if the entitlement has none yet, and returns it. */
async function tokenFor(sessionId: string): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from('assessment_entitlements')
    .select('access_token')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!data) return null;
  if (data.access_token) return data.access_token;

  const token = `${randomId()}${randomId()}`.replace(/-/g, '');
  const { error } = await admin
    .from('assessment_entitlements')
    .update({ access_token: token })
    .eq('session_id', sessionId);

  return error ? null : token;
}

export async function sendReportEmail({
  to,
  sessionId,
  locale = 'pt-br',
}: {
  to: string;
  sessionId: string;
  locale?: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const token = await tokenFor(sessionId);
  if (!token) return false;

  const copy = COPY[locale] ?? COPY['pt-br'];
  const url = `${SITE_URL}/${locale}/r/${sessionId}?acesso=${token}`;

  try {
    const { error } = await resend.emails.send({
      from: MAIL_FROM,
      to,
      subject: copy.subject,
      // Inline styles and a table layout, because email clients are not
      // browsers: no external stylesheet, no flexbox, no custom properties.
      html: `<!doctype html>
<html lang="${locale}"><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;">
        <tr><td style="font-size:14px;font-weight:700;letter-spacing:0.22em;color:#10131c;padding-bottom:24px;">NURA</td></tr>
        <tr><td style="font-size:22px;font-weight:700;color:#10131c;padding-bottom:12px;">${copy.heading}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#4a5060;padding-bottom:24px;">${copy.body}</td></tr>
        <tr><td style="padding-bottom:24px;">
          <a href="${url}" style="display:inline-block;background:#3b67ff;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:999px;">${copy.cta}</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.5;color:#7a8194;border-top:1px solid #e6e8ec;padding-top:20px;">${copy.note}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
      text: `${copy.heading}\n\n${copy.body}\n\n${copy.cta}: ${url}\n\n${copy.note}`,
    });

    if (error) {
      console.warn('[nura] report email failed', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[nura] report email threw', error);
    return false;
  }
}
