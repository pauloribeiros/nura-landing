'use client';

/**
 * Funnel instrumentation.
 *
 * The event names come from NURA_PRODUCT_MASTER.md section 54 and are the
 * contract the funnel is measured against, so they are typed rather than free
 * strings.
 *
 * Provider is PostHog, initialised lazily and ONLY after the visitor opts in.
 * Consent gating lives here on purpose — assessment answers touch sensitive
 * personal data under the LGPD, so nothing may fire before an explicit yes,
 * and a revoke has to stop capture immediately. The consent choice is
 * persisted so the banner asks once, not on every page.
 *
 * With no NEXT_PUBLIC_POSTHOG_KEY configured, consent still works but events
 * go nowhere (dev builds log them to the console). That keeps local work and
 * preview servers from polluting the production funnel.
 */

export type AnalyticsEvent =
  | { name: 'landing_view'; props: { locale: string } }
  | { name: 'hero_cta_click'; props: { locale: string; placement: string } }
  | { name: 'assessment_view'; props: { assessment: string; locale: string } }
  | { name: 'assessment_started'; props: { assessment: string; locale: string } }
  | { name: 'assessment_step_completed'; props: { assessment: string; step: number } }
  | { name: 'assessment_completed'; props: { assessment: string } }
  | { name: 'context_completed'; props: { assessment: string; answered: number } }
  | { name: 'result_viewed'; props: { assessment: string; band: string } }
  | { name: 'premium_offer_viewed'; props: { assessment: string } }
  | { name: 'next_assessment_offer_viewed'; props: { assessment: string } }
  | { name: 'lead_submitted'; props: { assessment: string; source: string } }
  | { name: 'checkout_started'; props: { assessment: string } }
  | { name: 'purchase_completed'; props: { assessment: string } }
  | { name: 'nura_profile_viewed'; props: Record<string, never> }
  | { name: 'next_assessment_clicked'; props: { from: string; to: string } };

const CONSENT_KEY = 'nura.analytics-consent.v1';

type Consent = 'granted' | 'denied';

let consentGranted = false;
let posthogReady = false;

/** The choice made on a previous visit, if any. Null means never asked. */
export function storedConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

function persistConsent(value: Consent) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Private mode — the banner will simply ask again next visit.
  }
}

async function startPosthog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || posthogReady) return;

  const { default: posthog } = await import('posthog-js');
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    // The funnel is event-based; automatic pageviews would double-count
    // landing_view, and autocapture would hoover up clicks nobody asked for.
    capture_pageview: false,
    autocapture: false,
    // Memory-only until consent is granted — and it only runs after consent,
    // so no cookie exists for someone who said no.
    persistence: 'localStorage',
  });
  posthogReady = true;
}

/** Called by the consent banner once the visitor opts in. */
export function grantAnalyticsConsent() {
  consentGranted = true;
  persistConsent('granted');
  void startPosthog();
}

export function denyAnalyticsConsent() {
  consentGranted = false;
  persistConsent('denied');
}

export function revokeAnalyticsConsent() {
  consentGranted = false;
  persistConsent('denied');
  if (posthogReady) {
    void import('posthog-js').then(({ default: posthog }) => posthog.opt_out_capturing());
  }
}

/** Re-applies a previously stored "yes" — called once on mount. */
export function restoreAnalyticsConsent() {
  if (storedConsent() === 'granted') {
    consentGranted = true;
    void startPosthog();
  }
}

export function track<E extends AnalyticsEvent>(name: E['name'], props: E['props']) {
  if (!consentGranted) return;

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics]', name, props);
    return;
  }

  if (!posthogReady) return;
  void import('posthog-js').then(({ default: posthog }) => posthog.capture(name, props));
}
