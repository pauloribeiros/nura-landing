/**
 * Shared scene state. Plain mutable object on purpose: GSAP tweens `progress`
 * and `useFrame` reads it, so the scroll narrative never triggers a React
 * render. Nothing here is React state.
 */

export type Quality = 'low' | 'high';

export const glState = {
  /** Single source of scroll truth, 0 at the top of the page, 1 at the bottom. */
  progress: 0,

  /** Pointer parallax, normalised to -1..1. */
  pointerX: 0,
  pointerY: 0,

  isMobile: false,
  quality: 'high' as Quality,

  /** Set while the tab is hidden or the canvas is scrolled out of view. */
  paused: false,
};

/**
 * Scene beats, as fractions of total scroll. Names match the narrative in
 * NURA_PRODUCT_MASTER.md section 48 and the brief's scene list.
 */
export const SCENE = {
  hero: 0.0,
  dimensions: 0.2,
  attention: 0.45,
  assessments: 0.6,
  reconnection: 0.75,
  profile: 1.0,
} as const;

/** Hermite smoothstep — eases the edges so beats blend instead of snapping. */
export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Rises to 1 across [a,b] then falls back to 0 across [c,d]. */
export function band(x: number, a: number, b: number, c: number, d: number) {
  return smoothstep(a, b, x) * (1 - smoothstep(c, d, x));
}

/**
 * Everything the scene needs, derived from one number. Adding a beat means
 * editing this function — not registering another ScrollTrigger.
 */
export function sceneWeights(p: number) {
  return {
    /** Core breaks apart into dimension clusters. */
    spread: smoothstep(SCENE.hero + 0.06, SCENE.dimensions + 0.12, p),
    /** Camera travels into the Attention cluster; the others recede. */
    attention: band(p, SCENE.dimensions + 0.14, SCENE.attention, SCENE.assessments, SCENE.reconnection),
    /** Clusters return and links form: the NURA Profile. */
    reconnect: smoothstep(SCENE.reconnection - 0.06, SCENE.profile - 0.05, p),
  };
}

/**
 * Rough device tier, resolved once before the canvas mounts. Cheap signals
 * only — a real benchmark would cost more than it saves.
 */
export function detectQuality(): Quality {
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio || 1;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (cores <= 4) return 'low';
  if (coarse && dpr > 2.5) return 'low';
  return 'high';
}
