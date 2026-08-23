import * as THREE from 'three';

/**
 * The five NURA dimensions as they exist in the scene.
 *
 * The previous version assigned nodes to clusters with `i % 5` and declared a
 * COLORS array it never used, so every cluster looked identical — you could not
 * tell Attention from Career. Each dimension now has its own position, colour
 * and density, which is what makes the Attention scene readable.
 *
 * Palette follows the brief: blue, cyan and white carry the scene; violet is
 * reserved for a single dimension so it stays a punctuation mark rather than a
 * third theme colour.
 */
export interface Dimension {
  /** Matches the message key under `profile.*`. */
  id: 'attention' | 'cognition' | 'personality' | 'behaviour' | 'career';
  center: THREE.Vector3;
  color: THREE.Color;
  /** Relative share of nodes and particles. Attention gets the most because it
   *  becomes the protagonist of the TDAH scene. */
  weight: number;
  /** Radius of the cluster once the core has spread. */
  radius: number;
}

export const DIMENSIONS: Dimension[] = [
  {
    id: 'attention',
    center: new THREE.Vector3(-4.2, 1.9, 2.1),
    color: new THREE.Color('#22D3E5'),
    weight: 1.5,
    radius: 1.9,
  },
  {
    id: 'cognition',
    center: new THREE.Vector3(4.1, 3.0, -1.1),
    color: new THREE.Color('#3B67FF'),
    weight: 1.15,
    radius: 1.7,
  },
  {
    id: 'personality',
    center: new THREE.Vector3(3.2, -3.1, 2.0),
    color: new THREE.Color('#7557FF'),
    weight: 1.0,
    radius: 1.6,
  },
  {
    id: 'behaviour',
    center: new THREE.Vector3(-3.1, -2.2, -2.2),
    color: new THREE.Color('#9FD4FF'),
    weight: 0.95,
    radius: 1.5,
  },
  {
    id: 'career',
    center: new THREE.Vector3(0.2, -4.2, 1.0),
    color: new THREE.Color('#E4F1FF'),
    weight: 0.8,
    radius: 1.4,
  },
];

export const ATTENTION_INDEX = DIMENSIONS.findIndex((d) => d.id === 'attention');

/**
 * Distributes `total` items across the dimensions proportionally to weight,
 * returning the dimension index for each item.
 */
export function assignDimensions(total: number): number[] {
  const sum = DIMENSIONS.reduce((acc, d) => acc + d.weight, 0);
  const out: number[] = [];
  DIMENSIONS.forEach((d, i) => {
    const count = Math.round((d.weight / sum) * total);
    for (let n = 0; n < count; n++) out.push(i);
  });
  // Rounding can leave the array a couple short or long.
  while (out.length < total) out.push(ATTENTION_INDEX);
  return out.slice(0, total);
}

/** Node and particle budgets per quality tier. */
export const BUDGET = {
  high: { nodes: 90, particles: 420, links: 64 },
  low: { nodes: 44, particles: 180, links: 28 },
} as const;
