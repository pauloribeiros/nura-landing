import { locales, type Locale } from '@/i18n/routing';
import { asrs18Locales } from '@/domain/assessment/instruments/asrs18';

/**
 * Structure of the product content. Every user-facing string lives in
 * `messages/<locale>.json` and is referenced here by key, so adding a locale
 * never means touching a component.
 */

export interface AssessmentEntry {
  /** Stable id — also the message key under `assessments.*`. */
  id: string;
  /** Catalog number shown in the grid. */
  index: string;
  /** URL segment per locale, used by `/[locale]/testes/[slug]`. */
  slug: Record<Locale, string>;
  /** The anchor assessment gets its own section on the home page. */
  featured: boolean;
  /**
   * Whether the assessment has a landing page and an entry point today.
   * An assessment without one is listed in the catalog as upcoming — we do not
   * publish a landing page for something that cannot be started, because thin
   * pages for non-existent products cost more in SEO than they earn.
   */
  available: boolean;
}

export const ASSESSMENTS: AssessmentEntry[] = [
  {
    id: 'attention',
    index: '01',
    slug: { 'pt-br': 'tdah', en: 'adhd', es: 'tdah' },
    featured: true,
    available: true,
  },
  {
    id: 'autism',
    index: '02',
    slug: { 'pt-br': 'espectro-autista', en: 'autism-spectrum', es: 'espectro-autista' },
    featured: false,
    available: false,
  },
  {
    id: 'cognition',
    index: '03',
    slug: { 'pt-br': 'perfil-cognitivo', en: 'cognitive-profile', es: 'perfil-cognitivo' },
    featured: false,
    available: false,
  },
  {
    id: 'giftedness',
    index: '04',
    slug: { 'pt-br': 'altas-habilidades', en: 'giftedness', es: 'altas-capacidades' },
    featured: false,
    available: false,
  },
];

export const FEATURED_ASSESSMENT = ASSESSMENTS.find((a) => a.featured)!;
export const GRID_ASSESSMENTS = ASSESSMENTS.filter((a) => !a.featured);
export const AVAILABLE_ASSESSMENTS = ASSESSMENTS.filter((a) => a.available);

export function assessmentBySlug(locale: Locale, slug: string) {
  return ASSESSMENTS.find((a) => a.slug[locale] === slug);
}

/** Route segments. Localised so the URLs read naturally in each market. */
export const ROUTE_SEGMENTS = {
  catalog: { 'pt-br': 'testes', en: 'tests', es: 'tests' },
  assessment: { 'pt-br': 'avaliacao', en: 'assessment', es: 'evaluacion' },
} as const satisfies Record<string, Record<Locale, string>>;

export const catalogPath = (locale: Locale) => `/${locale}/${ROUTE_SEGMENTS.catalog[locale]}`;

export const assessmentLandingPath = (locale: Locale, a: AssessmentEntry) =>
  `${catalogPath(locale)}/${a.slug[locale]}`;

export const assessmentStartPath = (locale: Locale, a: AssessmentEntry) =>
  `/${locale}/${ROUTE_SEGMENTS.assessment[locale]}/${a.slug[locale]}`;

/**
 * A report lives on its own route, not under `[section]`.
 *
 * Its rendering mode is the opposite of every marketing page: per-person,
 * read at request time from cookies, never prerendered. Sharing a route with
 * statically generated pages made Next try to prerender it and fail on
 * `cookies()`. The segment is short and unlocalised because the URL is
 * private and never indexed — there is no reader to read it.
 */
export const reportPath = (locale: Locale, sessionId: string) =>
  `/${locale}/r/${sessionId}`;

/** Which kind of page a `[section]` segment addresses, if any. */
export function sectionKind(locale: Locale, segment: string): 'catalog' | 'assessment' | null {
  if (ROUTE_SEGMENTS.catalog[locale] === segment) return 'catalog';
  if (ROUTE_SEGMENTS.assessment[locale] === segment) return 'assessment';
  return null;
}

/**
 * Locales an assessment can actually be taken in, so the landing may exist in
 * a locale the run does not.
 *
 * Derived from each instrument rather than listed here. This used to be a
 * hand-kept map, which meant the same fact lived in two files. The drift that
 * causes is not cosmetic: it would let a locale be offered whose items are
 * still a draft translation of a clinical instrument. The instrument owns the
 * answer; this only asks it.
 */
export const ASSESSMENT_RUN_LOCALES: Record<string, Locale[]> = {
  attention: asrs18Locales.filter((l): l is Locale =>
    (locales as readonly string[]).includes(l),
  ),
};

export const canRunAssessment = (locale: Locale, a: AssessmentEntry) =>
  a.available && (ASSESSMENT_RUN_LOCALES[a.id] ?? []).includes(locale);

/** Section anchors on the home page. Stable across locales. */
export const SECTION_IDS = {
  top: 'inicio',
  featured: 'tdah',
  assessments: 'avaliacoes',
  howItWorks: 'como-funciona',
  profile: 'perfil',
  result: 'resultado',
  premium: 'aprofundar',
  trust: 'responsabilidade',
  faq: 'faq',
} as const;

export const HOW_IT_WORKS_STEPS = ['answer', 'discover', 'deepen'] as const;

export const FAQ_IDS = ['diagnosis', 'price', 'data', 'duration'] as const;

/** The NURA Profile map. `filled` is how many dimensions of that area the
 *  ecosystem currently exposes — never a score. */
export const PROFILE_DIMENSIONS = [
  { id: 'cognition', filled: 4, tone: 'cyan' },
  { id: 'attention', filled: 3, tone: 'cyan' },
  { id: 'personality', filled: 4, tone: 'violet' },
  { id: 'behaviour', filled: 2, tone: 'cyan' },
  { id: 'career', filled: 0, tone: 'cyan' },
] as const;

export const PROFILE_DOT_COUNT = 5;

/** Illustrative preview of a result card. Not real data. */
export const RESULT_METRICS = [
  { id: 'reasoning', value: 87 },
  { id: 'patterns', value: 91 },
  { id: 'attention', value: 78 },
  { id: 'memory', value: 82 },
] as const;

export const TRUST_POINTS = ['information', 'privacy', 'methodology'] as const;

export const PREMIUM_BENEFITS = ['analysis', 'dimensions', 'recommendations', 'profile'] as const;

/** What the featured assessment landing explains, in order. */
export const ATTENTION_COVERS = ['focus', 'organisation', 'impulsivity', 'routine'] as const;

/** Blocks the assessment is divided into, shown on the intro screen. */
export const ATTENTION_BLOCKS = ['focus', 'organisation', 'impulsivity', 'routine'] as const;
