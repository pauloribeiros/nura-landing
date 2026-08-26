/**
 * Absolute origin for canonical, og:url, sitemap and JSON-LD. Vercel injects
 * VERCEL_PROJECT_PRODUCTION_URL on every deployment, so production is correct
 * without any manual step; SITE_URL overrides it once a custom domain exists.
 */
export const SITE_URL = (
  // `||`, not `??`: a variable created but left blank in a hosting panel
  // arrives as an empty string, which `??` would accept as the answer and
  // leave every canonical URL pointing nowhere.
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '');

export const PRICE_BRL = 19.9;
