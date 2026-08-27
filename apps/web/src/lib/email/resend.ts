import 'server-only';

import { Resend } from 'resend';

/**
 * Email delivery, server only.
 *
 * Returns null when Resend is not configured, so nothing else fails because
 * email is absent. A purchase must complete whether or not the receipt goes
 * out — the report is already reachable in the browser that bought it, and an
 * email that failed to send is a smaller problem than a payment that failed to
 * grant access.
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Who the mail comes from.
 *
 * Must be a domain verified in Resend. Until a custom domain exists, Resend's
 * sandbox sender works for testing but only delivers to the account owner —
 * so a real address here is what makes delivery to customers work at all.
 */
export const MAIL_FROM = process.env.RESEND_FROM ?? 'NURA <onboarding@resend.dev>';

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);
