'use client';

/**
 * Funnel instrumentation.
 *
 * The event names come from NURA_PRODUCT_MASTER.md section 54 and are the
 * contract the funnel is measured against, so they are typed rather than free
 * strings. No provider is wired yet: `track` is a no-op in production until
 * PostHog is connected AND the visitor has consented. Consent gating lives
 * here on purpose — assessment answers touch sensitive personal data under the
 * LGPD, so nothing may fire before an explicit opt-in.
 */

export type AnalyticsEvent =
  | { name: 'landing_view'; props: { locale: string } }
  | { name: 'hero_cta_click'; props: { locale: string; placement: string } }
  | { name: 'assessment_view'; props: { assessment: string; locale: string } }
  | { name: 'assessment_started'; props: { assessment: string; locale: string } }
  | { name: 'assessment_step_completed'; props: { assessment: string; step: number } }
  | { name: 'assessment_completed'; props: { assessment: string } }
  | { name: 'result_viewed'; props: { assessment: string } }
  | { name: 'premium_offer_viewed'; props: { assessment: string } }
  | { name: 'checkout_started'; props: { assessment: string } }
  | { name: 'purchase_completed'; props: { assessment: string } }
  | { name: 'nura_profile_viewed'; props: Record<string, never> }
  | { name: 'next_assessment_clicked'; props: { from: string; to: string } };

let consentGranted = false;

/** Called by the consent banner once the visitor opts in. */
export function grantAnalyticsConsent() {
  consentGranted = true;
}

export function revokeAnalyticsConsent() {
  consentGranted = false;
}

export function track<E extends AnalyticsEvent>(name: E['name'], props: E['props']) {
  if (!consentGranted) return;

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics]', name, props);
    return;
  }

  // Provider goes here once PostHog is connected. Keeping the call site typed
  // means wiring it later touches this file only.
}
