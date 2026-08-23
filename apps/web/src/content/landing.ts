/**
 * Structure of the landing content. Every user-facing string lives in
 * `messages/<locale>.json` and is referenced here by key, so adding a locale
 * never means touching a component.
 */

export interface AssessmentEntry {
  /** Stable id — also the message key under `assessments.*`. */
  id: string;
  /** Catalog number shown in the grid. */
  index: string;
  /** URL segment per locale. Assessment landings will live at
   *  `/[locale]/testes/[slug]`; kept here so the route and the catalog cannot
   *  drift apart. */
  slug: Record<string, string>;
  /** The anchor assessment gets its own section instead of a grid card. */
  featured: boolean;
  /** Whether the assessment can actually be started today. */
  available: boolean;
}

export const ASSESSMENTS: AssessmentEntry[] = [
  {
    id: 'attention',
    index: '01',
    slug: { 'pt-br': 'tdah', en: 'adhd', es: 'tdah' },
    featured: true,
    available: false,
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

/** Section anchors. Stable across locales so shared links keep working. */
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
